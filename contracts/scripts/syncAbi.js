const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "contracts");
const OUT_DIR = path.join(__dirname, "..", "..", "web", "lib", "contracts", "abi");

const targets = [
  { source: "AuctionHouse.sol/AuctionHouse.json", out: "AuctionHouse.json" },
  { source: "MockCollectible.sol/MockCollectible.json", out: "MockCollectible.json" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { source, out } of targets) {
  const artifactPath = path.join(ARTIFACTS_DIR, source);
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}. Run "npm run compile" first.`);
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(path.join(OUT_DIR, out), JSON.stringify(artifact.abi, null, 2));
  console.log(`Synced ${out}`);
}
