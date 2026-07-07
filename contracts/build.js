// build.js
// Compiles all contracts in contracts/ using the solc npm package (pure JS/WASM,
// installed from the npm registry — no external binary download required) and
// writes output in the exact directory/JSON shape Hardhat expects under artifacts/,
// so `npx hardhat test --no-compile` (and hardhat-ethers' getContractFactory) work
// normally. This is a workaround for sandboxed environments that block
// binaries.soliditylang.org; in a normal dev environment `npx hardhat compile`
// works out of the box and this script is not needed.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const CONTRACTS_DIR = path.join(__dirname, "contracts");
const ARTIFACTS_DIR = path.join(__dirname, "artifacts");
const NODE_MODULES = path.join(__dirname, "node_modules");

function findSolFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findSolFiles(full));
    else if (entry.name.endsWith(".sol")) results.push(full);
  }
  return results;
}

function findImports(importPath) {
  // Resolve node_modules imports (e.g. @openzeppelin/contracts/...)
  const candidates = [
    path.join(NODE_MODULES, importPath),
    path.join(CONTRACTS_DIR, importPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

const solFiles = findSolFiles(CONTRACTS_DIR);
const sources = {};
for (const file of solFiles) {
  const rel = path.relative(__dirname, file);
  sources[rel] = { content: fs.readFileSync(file, "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
      },
    },
  },
};

console.log(`Compiling ${solFiles.length} file(s) with solc ${solc.version()}...`);
const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

let hasError = false;
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === "error") {
      hasError = true;
      console.error(err.formattedMessage);
    } else {
      console.warn(err.formattedMessage);
    }
  }
}
if (hasError) {
  process.exit(1);
}

for (const [sourcePath, fileOutput] of Object.entries(output.contracts)) {
  for (const [contractName, contractOutput] of Object.entries(fileOutput)) {
    const outDir = path.join(ARTIFACTS_DIR, sourcePath);
    fs.mkdirSync(outDir, { recursive: true });
    const artifact = {
      _format: "hh-sol-artifact-1",
      contractName,
      sourceName: sourcePath,
      abi: contractOutput.abi,
      bytecode: "0x" + contractOutput.evm.bytecode.object,
      deployedBytecode: "0x" + contractOutput.evm.deployedBytecode.object,
      linkReferences: contractOutput.evm.bytecode.linkReferences || {},
      deployedLinkReferences: contractOutput.evm.deployedBytecode.linkReferences || {},
    };
    fs.writeFileSync(
      path.join(outDir, `${contractName}.json`),
      JSON.stringify(artifact, null, 2)
    );
    // Minimal debug file some tooling expects alongside the artifact.
    fs.writeFileSync(
      path.join(outDir, `${contractName}.dbg.json`),
      JSON.stringify(
        { _format: "hh-sol-dbg-1", buildInfo: null },
        null,
        2
      )
    );
  }
}

// Also emit a flat artifacts/contracts.json map for quick frontend ABI import.
const flat = {};
for (const [sourcePath, fileOutput] of Object.entries(output.contracts)) {
  for (const [contractName, contractOutput] of Object.entries(fileOutput)) {
    flat[contractName] = {
      abi: contractOutput.abi,
      bytecode: "0x" + contractOutput.evm.bytecode.object,
    };
  }
}
fs.writeFileSync(
  path.join(ARTIFACTS_DIR, "contracts.flat.json"),
  JSON.stringify(flat, null, 2)
);

console.log("Compilation complete. Artifacts written to /artifacts.");
