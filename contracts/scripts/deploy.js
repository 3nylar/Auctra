const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys the AuctionHouse contract and a MockCollectible NFT, mints one
// demo item, and lists it as a sample auction so the app never opens on a
// completely empty page. Writes addresses to
// web/lib/contracts/deployments/<network>.json for the frontend to pick up.
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to network "${network.name}" from ${deployer.address}`);

  const MockCollectible = await ethers.getContractFactory("MockCollectible");
  const nft = await MockCollectible.deploy();
  await nft.waitForDeployment();
  console.log("MockCollectible deployed to:", await nft.getAddress());

  const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
  const house = await AuctionHouse.deploy();
  await house.waitForDeployment();
  console.log("AuctionHouse deployed to:", await house.getAddress());

  // Seed one sample auction so the marketplace isn't empty on first visit.
  const mintTx = await nft.mint("Genesis Auctra Item");
  await mintTx.wait();
  const tokenId = 0n;
  await (await nft.approve(await house.getAddress(), tokenId)).wait();

  const startingPrice = ethers.parseEther("0.01");
  const durationSeconds = 3 * 24 * 60 * 60; // 3 days
  const minIncrementBps = 500; // 5%
  const extensionWindowSeconds = 5 * 60; // 5 minutes
  const extensionDurationSeconds = 5 * 60; // 5 minutes

  await (
    await house.createAuction(
      await nft.getAddress(),
      tokenId,
      startingPrice,
      durationSeconds,
      minIncrementBps,
      extensionWindowSeconds,
      extensionDurationSeconds
    )
  ).wait();
  console.log("Seeded a sample 3-day auction (auction ID 0) starting at 0.01 ETH");

  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    contracts: {
      auctionHouse: { address: await house.getAddress() },
      mockCollectible: { address: await nft.getAddress() },
    },
  };

  const outDir = path.join(__dirname, "..", "..", "web", "lib", "contracts", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info written to ${outFile}`);
  console.log("\nAdd these to your web/.env.local:");
  console.log(`NEXT_PUBLIC_CHAIN_NAME=${network.name}`);
  console.log(`NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS=${await house.getAddress()}`);
  console.log(`NEXT_PUBLIC_NFT_ADDRESS=${await nft.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
