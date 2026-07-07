const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AuctionHouse", function () {
  async function deployFixture() {
    const [deployer, seller, alice, bob, carol] = await ethers.getSigners();

    const MockCollectible = await ethers.getContractFactory("MockCollectible");
    const nft = await MockCollectible.deploy();

    const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
    const house = await AuctionHouse.deploy();

    // Seller mints an item and approves the house to escrow it.
    await nft.connect(seller).mint("Vintage Synth #1");
    const tokenId = 0n;
    await nft.connect(seller).approve(await house.getAddress(), tokenId);

    return { house, nft, tokenId, deployer, seller, alice, bob, carol };
  }

  async function createStandardAuction(house, nft, tokenId, seller, overrides = {}) {
    const startingPrice = overrides.startingPrice ?? ethers.parseEther("1");
    const duration = overrides.duration ?? 3600; // 1 hour
    const minIncrementBps = overrides.minIncrementBps ?? 500; // 5%
    const extensionWindow = overrides.extensionWindow ?? 300; // 5 min
    const extensionDuration = overrides.extensionDuration ?? 300; // 5 min

    const tx = await house
      .connect(seller)
      .createAuction(
        await nft.getAddress(),
        tokenId,
        startingPrice,
        duration,
        minIncrementBps,
        extensionWindow,
        extensionDuration
      );
    await tx.wait();
    return 0n; // first auction created in a fresh fixture is always id 0
  }

  describe("createAuction", function () {
    it("escrows the NFT and records auction terms", async function () {
      const { house, nft, tokenId, seller } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      expect(await nft.ownerOf(tokenId)).to.equal(await house.getAddress());

      const auction = await house.getAuction(auctionId);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.startingPrice).to.equal(ethers.parseEther("1"));
      expect(auction.highestBid).to.equal(0n);
    });
  });

  describe("bid", function () {
    it("accepts a bid at or above the starting price and rejects below it", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await expect(
        house.connect(alice).bid(auctionId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(house, "BidTooLow");

      await expect(house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") })).to.emit(
        house,
        "BidPlaced"
      );

      const auction = await house.getAuction(auctionId);
      expect(auction.highestBidder).to.equal(alice.address);
      expect(auction.highestBid).to.equal(ethers.parseEther("1"));
    });

    it("requires each subsequent bid to exceed the previous by at least minIncrement", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });
      // 5% of 1 ETH = 0.05 ETH, so 1.04 ETH should be rejected, 1.05 accepted.
      await expect(
        house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.04") })
      ).to.be.revertedWithCustomError(house, "BidTooLow");

      await expect(
        house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.05") })
      ).to.emit(house, "BidPlaced");
    });

    it("credits the previous highest bidder's refund instead of pushing ETH directly", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });
      const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);

      await house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.1") });

      // Alice's wallet balance should NOT have changed yet -- refund is pull-based.
      const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceBalanceAfter).to.equal(aliceBalanceBefore);

      expect(await house.pendingWithdrawals(auctionId, alice.address)).to.equal(ethers.parseEther("1"));
    });

    it("rejects bids after the deadline has passed", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });

      await time.increase(101);

      await expect(
        house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(house, "AuctionAlreadyEnded");
    });
  });

  describe("anti-snipe extension", function () {
    it("extends the deadline when a bid lands inside the extension window", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, {
        duration: 600,
        extensionWindow: 300,
        extensionDuration: 300,
      });

      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });
      const auctionBefore = await house.getAuction(auctionId);

      // Fast-forward to inside the last 5 minutes.
      await time.increase(350);

      await expect(house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.1") })).to.emit(
        house,
        "AuctionExtended"
      );

      const auctionAfter = await house.getAuction(auctionId);
      expect(auctionAfter.endTime).to.be.greaterThan(auctionBefore.endTime);
    });

    it("does NOT extend when a bid lands well before the extension window", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, {
        duration: 3600,
        extensionWindow: 300,
        extensionDuration: 300,
      });

      const auctionBefore = await house.getAuction(auctionId);
      await expect(
        house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") })
      ).to.not.emit(house, "AuctionExtended");
      const auctionAfter = await house.getAuction(auctionId);
      expect(auctionAfter.endTime).to.equal(auctionBefore.endTime);
    });

    it("caps the number of extensions to bound worst-case auction duration", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, {
        duration: 3600,
        extensionWindow: 3600, // always inside the window, to force repeated extensions
        extensionDuration: 60,
      });

      let bidder = alice;
      let otherBidder = bob;
      let amount = ethers.parseEther("1");

      for (let i = 0; i < 55; i++) {
        await house.connect(bidder).bid(auctionId, { value: amount });
        amount = (amount * 110n) / 100n;
        [bidder, otherBidder] = [otherBidder, bidder];
      }

      expect(await house.extensionCount(auctionId)).to.equal(await house.MAX_EXTENSIONS());
    });
  });

  describe("withdraw (pull-payment refunds)", function () {
    it("lets an outbid bidder withdraw their exact refund", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });
      await house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.1") });

      const balanceBefore = await ethers.provider.getBalance(alice.address);
      const tx = await house.connect(alice).withdraw(auctionId);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(alice.address);

      expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("1") - gasCost);
      expect(await house.pendingWithdrawals(auctionId, alice.address)).to.equal(0n);
    });

    it("reverts with NothingToWithdraw for a zero balance", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await expect(house.connect(alice).withdraw(auctionId)).to.be.revertedWithCustomError(
        house,
        "NothingToWithdraw"
      );
    });

    it("a refund-rejecting bidder only blocks their OWN withdrawal, never the auction", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      const MaliciousBidder = await ethers.getContractFactory("MaliciousBidder");
      const attacker = await MaliciousBidder.deploy(await house.getAddress());
      await attacker.setBehavior(true, false, auctionId); // rejectEth = true

      await attacker.placeBid(auctionId, ethers.parseEther("1"), { value: ethers.parseEther("1") });

      // A normal bidder can still outbid the attacker without issue.
      await expect(
        house.connect(alice).bid(auctionId, { value: ethers.parseEther("1.1") })
      ).to.emit(house, "BidPlaced");

      const auction = await house.getAuction(auctionId);
      expect(auction.highestBidder).to.equal(alice.address);

      // The attacker's own withdrawal fails (their contract rejects ETH),
      // but that's their own problem -- it does not affect anyone else or
      // the auction's ability to proceed.
      await expect(attacker.attemptWithdraw(auctionId)).to.be.reverted;
    });

    it("blocks reentrant withdrawal attempts", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      const MaliciousBidder = await ethers.getContractFactory("MaliciousBidder");
      const attacker = await MaliciousBidder.deploy(await house.getAddress());
      await attacker.setBehavior(false, true, auctionId); // reenterOnReceive = true

      await attacker.placeBid(auctionId, ethers.parseEther("1"), { value: ethers.parseEther("1") });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1.1") });

      expect(await house.pendingWithdrawals(auctionId, await attacker.getAddress())).to.equal(
        ethers.parseEther("1")
      );

      const houseBalanceBefore = await ethers.provider.getBalance(await house.getAddress());

      // The reentrant call inside receive() finds pendingWithdrawals already
      // zeroed (checks-effects-interactions) and reverts with
      // NothingToWithdraw; that sub-call failure propagates up through the
      // low-level .call(), making the OUTER withdraw() revert entirely with
      // TransferFailed. The whole transaction is atomic, so nothing is lost
      // and nothing is double-spent -- the attacker simply cannot withdraw
      // via this path at all.
      await expect(attacker.attemptWithdraw(auctionId)).to.be.revertedWithCustomError(
        house,
        "TransferFailed"
      );

      const houseBalanceAfter = await ethers.provider.getBalance(await house.getAddress());
      expect(houseBalanceAfter).to.equal(houseBalanceBefore);
      // Because the whole transaction reverted, state changes (including the
      // zeroing of pendingWithdrawals) were rolled back too -- the attacker's
      // legitimate balance is still intact and available via a normal,
      // non-reentrant withdrawal.
      expect(await house.pendingWithdrawals(auctionId, await attacker.getAddress())).to.equal(
        ethers.parseEther("1")
      );
    });
  });

  describe("endAuction", function () {
    it("reverts if called before the deadline", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await expect(house.endAuction(auctionId)).to.be.revertedWithCustomError(
        house,
        "AuctionNotYetEndable"
      );
    });

    it("is callable by ANYONE (not just the seller) after the deadline", async function () {
      const { house, nft, tokenId, seller, alice, carol } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await time.increase(101);

      // carol is a totally unrelated third party.
      await expect(house.connect(carol).endAuction(auctionId)).to.emit(house, "AuctionEnded");

      expect(await house.pendingWithdrawals(auctionId, seller.address)).to.equal(ethers.parseEther("1"));
    });

    it("credits nothing to the seller if there were no bids", async function () {
      const { house, nft, tokenId, seller } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });

      await time.increase(101);
      await house.endAuction(auctionId);

      expect(await house.pendingWithdrawals(auctionId, seller.address)).to.equal(0n);
    });
  });

  describe("claimItem", function () {
    it("lets the winner claim the item after the auction ends", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await time.increase(101);
      await house.endAuction(auctionId);

      await expect(house.connect(alice).claimItem(auctionId)).to.emit(house, "ItemClaimed");
      expect(await nft.ownerOf(tokenId)).to.equal(alice.address);
    });

    it("rejects a claim from anyone other than the winner", async function () {
      const { house, nft, tokenId, seller, alice, bob } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await time.increase(101);
      await house.endAuction(auctionId);

      await expect(house.connect(bob).claimItem(auctionId)).to.be.revertedWithCustomError(
        house,
        "NotHighestBidder"
      );
    });

    it("lets the seller reclaim the item if there were no bids", async function () {
      const { house, nft, tokenId, seller } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });

      await time.increase(101);
      await house.endAuction(auctionId);

      await expect(house.connect(seller).claimItem(auctionId)).to.emit(house, "ItemClaimed");
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("prevents double-claiming", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await time.increase(101);
      await house.endAuction(auctionId);
      await house.connect(alice).claimItem(auctionId);

      await expect(house.connect(alice).claimItem(auctionId)).to.be.revertedWithCustomError(
        house,
        "ItemAlreadyClaimed"
      );
    });
  });

  describe("cancelAuction", function () {
    it("lets the seller cancel before any bids and returns the item", async function () {
      const { house, nft, tokenId, seller } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await expect(house.connect(seller).cancelAuction(auctionId)).to.emit(house, "AuctionCancelled");
      expect(await nft.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("rejects cancellation once a bid has been placed", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });

      await expect(house.connect(seller).cancelAuction(auctionId)).to.be.revertedWithCustomError(
        house,
        "AuctionHasBids"
      );
    });

    it("rejects cancellation from anyone other than the seller", async function () {
      const { house, nft, tokenId, seller, alice } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller);

      await expect(house.connect(alice).cancelAuction(auctionId)).to.be.revertedWithCustomError(
        house,
        "NotSeller"
      );
    });
  });

  describe("full lifecycle integration", function () {
    it("runs a complete auction from listing to claim with multiple competing bids", async function () {
      const { house, nft, tokenId, seller, alice, bob, carol } = await loadFixture(deployFixture);
      const auctionId = await createStandardAuction(house, nft, tokenId, seller, { duration: 100, extensionWindow: 0 });

      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("1") });
      await house.connect(bob).bid(auctionId, { value: ethers.parseEther("1.2") });
      await house.connect(carol).bid(auctionId, { value: ethers.parseEther("1.5") });
      await house.connect(alice).bid(auctionId, { value: ethers.parseEther("2") });

      // Bob and Carol should each be able to withdraw their exact refund.
      expect(await house.pendingWithdrawals(auctionId, bob.address)).to.equal(ethers.parseEther("1.2"));
      expect(await house.pendingWithdrawals(auctionId, carol.address)).to.equal(ethers.parseEther("1.5"));
      await house.connect(bob).withdraw(auctionId);
      await house.connect(carol).withdraw(auctionId);

      await time.increase(101);
      await house.endAuction(auctionId);

      await house.connect(alice).claimItem(auctionId);
      expect(await nft.ownerOf(tokenId)).to.equal(alice.address);

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const tx = await house.connect(seller).withdraw(auctionId);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter).to.equal(sellerBalanceBefore + ethers.parseEther("2") - gasCost);
    });
  });
});
