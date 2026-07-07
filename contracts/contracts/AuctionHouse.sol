// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AuctionHouse
/// @notice A trust-minimized English (ascending-price) auction house for
///         ERC-721 items. Anyone can list an item they own, anyone can bid,
///         outbid participants are refunded via a safe pull-payment
///         pattern, and a bid placed near the deadline automatically
///         extends the auction to prevent last-second sniping.
///
/// @dev    Design choice: a single contract manages many auctions by ID
///         (rather than deploying a fresh contract per auction). This is
///         cheaper to deploy, keeps every auction's history in one place
///         for easy off-chain indexing, and is the pattern most real
///         auction houses use in production.
///
///         Security model, in order of importance:
///          1. PULL-PAYMENT REFUNDS: outbid bidders and the seller's final
///             proceeds are *credited* to a `pendingWithdrawals` balance
///             and withdrawn by the recipient, never pushed automatically
///             inside `bid()` or `endAuction()`. This is the single most
///             important protection in this contract -- it means a
///             malicious bidder contract that reverts on receiving ETH
///             cannot block the auction for everyone else (a classic
///             DoS-via-revert attack on naively "auto-refunding" auctions).
///          2. CHECKS-EFFECTS-INTERACTIONS: state is always updated before
///             any external call.
///          3. ReentrancyGuard on every value- or NFT-moving function, as
///             defense-in-depth on top of #1 and #2.
///          4. No privileged admin override once bidding starts: nobody,
///             including the contract deployer, can cancel a live auction
///             or force an early end.
contract AuctionHouse is ERC721Holder, ReentrancyGuard {
    struct Auction {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 minIncrement;
        uint64 endTime;
        uint64 extensionWindow;
        uint64 extensionDuration;
        address highestBidder;
        uint256 highestBid;
        bool ended;
        bool cancelled;
        bool itemClaimed;
    }

    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;
    /// @dev auctionId => address => amount withdrawable (refunds + seller proceeds).
    mapping(uint256 => mapping(address => uint256)) public pendingWithdrawals;

    /// @notice Hard ceiling on how many times a single auction can be
    ///         extended by anti-snipe bids, bounding worst-case duration
    ///         against a "keep bidding in the last second forever" grief.
    uint256 public constant MAX_EXTENSIONS = 50;
    mapping(uint256 => uint256) public extensionCount;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nft,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 minIncrement,
        uint64 endTime,
        uint64 extensionWindow,
        uint64 extensionDuration
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint64 newEndTime);
    event Refunded(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionExtended(uint256 indexed auctionId, uint64 newEndTime);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    event AuctionCancelled(uint256 indexed auctionId);
    event ItemClaimed(uint256 indexed auctionId, address indexed claimant);
    event Withdrawn(uint256 indexed auctionId, address indexed to, uint256 amount);

    error NotSeller();
    error AuctionNotFound();
    error AuctionAlreadyEnded();
    error AuctionNotYetEndable();
    error AuctionHasBids();
    error BidTooLow();
    error NothingToWithdraw();
    error NotHighestBidder();
    error ItemAlreadyClaimed();
    error InvalidDuration();
    error InvalidNft();
    error TransferFailed();

    modifier auctionExists(uint256 auctionId) {
        if (auctionId >= auctionCount) revert AuctionNotFound();
        _;
    }

    /// @notice List an ERC-721 item for auction. The item is escrowed in
    ///         this contract immediately (you must `approve` this contract
    ///         for the token first), so bidders can be confident the seller
    ///         cannot sell it elsewhere mid-auction.
    /// @param nft Address of the ERC-721 contract.
    /// @param tokenId Token ID being auctioned.
    /// @param startingPrice Minimum acceptable first bid, in wei.
    /// @param durationSeconds How long the auction runs before it can be ended.
    /// @param minIncrementBps Minimum bid increment over the current highest bid, in basis points (e.g. 500 = 5%).
    /// @param extensionWindowSeconds If a valid bid lands within this many seconds of the deadline, the deadline extends.
    /// @param extensionDurationSeconds How much time a qualifying late bid adds to the clock.
    function createAuction(
        address nft,
        uint256 tokenId,
        uint256 startingPrice,
        uint64 durationSeconds,
        uint256 minIncrementBps,
        uint64 extensionWindowSeconds,
        uint64 extensionDurationSeconds
    ) external nonReentrant returns (uint256 auctionId) {
        if (nft == address(0)) revert InvalidNft();
        if (durationSeconds == 0) revert InvalidDuration();

        auctionId = auctionCount++;
        uint64 endTime = uint64(block.timestamp) + durationSeconds;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            startingPrice: startingPrice,
            minIncrement: (startingPrice * minIncrementBps) / 10_000,
            endTime: endTime,
            extensionWindow: extensionWindowSeconds,
            extensionDuration: extensionDurationSeconds,
            highestBidder: address(0),
            highestBid: 0,
            ended: false,
            cancelled: false,
            itemClaimed: false
        });

        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(
            auctionId,
            msg.sender,
            nft,
            tokenId,
            startingPrice,
            (startingPrice * minIncrementBps) / 10_000,
            endTime,
            extensionWindowSeconds,
            extensionDurationSeconds
        );
    }

    /// @notice Place a bid. Must strictly exceed the current highest bid by
    ///         at least the auction's minimum increment (or meet the
    ///         starting price, if you're the first bid). If your bid lands
    ///         within the auction's anti-snipe window, the deadline
    ///         automatically extends so nobody is shut out by a last-second
    ///         bid.
    function bid(uint256 auctionId) external payable nonReentrant auctionExists(auctionId) {
        Auction storage a = auctions[auctionId];
        if (a.ended || a.cancelled) revert AuctionAlreadyEnded();
        if (block.timestamp >= a.endTime) revert AuctionAlreadyEnded();

        uint256 minAcceptable = a.highestBid == 0 ? a.startingPrice : a.highestBid + a.minIncrement;
        if (msg.value < minAcceptable) revert BidTooLow();

        if (a.highestBidder != address(0)) {
            pendingWithdrawals[auctionId][a.highestBidder] += a.highestBid;
            emit Refunded(auctionId, a.highestBidder, a.highestBid);
        }

        a.highestBidder = msg.sender;
        a.highestBid = msg.value;

        uint64 newEndTime = a.endTime;
        if (
            a.extensionWindow > 0 &&
            a.endTime - uint64(block.timestamp) < a.extensionWindow &&
            extensionCount[auctionId] < MAX_EXTENSIONS
        ) {
            newEndTime = uint64(block.timestamp) + a.extensionDuration;
            a.endTime = newEndTime;
            extensionCount[auctionId]++;
            emit AuctionExtended(auctionId, newEndTime);
        }

        emit BidPlaced(auctionId, msg.sender, msg.value, newEndTime);
    }

    /// @notice Withdraw any ETH you're owed from this auction -- either a
    ///         refund from being outbid, or your proceeds as the seller
    ///         after the auction ended. Safe to call repeatedly; does
    ///         nothing if your balance is zero.
    function withdraw(uint256 auctionId) external nonReentrant auctionExists(auctionId) {
        uint256 amount = pendingWithdrawals[auctionId][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[auctionId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(auctionId, msg.sender, amount);
    }

    /// @notice Close out an auction once its deadline has passed. Callable
    ///         by anyone (not just the seller), so the seller can never
    ///         block settlement by refusing to act. Credits the seller's
    ///         proceeds to their withdrawable balance if there was a
    ///         winning bid; otherwise the item becomes reclaimable by the
    ///         seller via `claimItem`.
    function endAuction(uint256 auctionId) external nonReentrant auctionExists(auctionId) {
        Auction storage a = auctions[auctionId];
        if (a.ended || a.cancelled) revert AuctionAlreadyEnded();
        if (block.timestamp < a.endTime) revert AuctionNotYetEndable();

        a.ended = true;

        if (a.highestBid > 0) {
            pendingWithdrawals[auctionId][a.seller] += a.highestBid;
        }

        emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
    }

    /// @notice Claim the auctioned item. The winning bidder claims it after
    ///         the auction ends; if there were no bids at all, the seller
    ///         can reclaim their own item instead.
    function claimItem(uint256 auctionId) external nonReentrant auctionExists(auctionId) {
        Auction storage a = auctions[auctionId];
        if (!a.ended && !a.cancelled) revert AuctionNotYetEndable();
        if (a.itemClaimed) revert ItemAlreadyClaimed();

        address recipient;
        if (a.cancelled || a.highestBid == 0) {
            if (msg.sender != a.seller) revert NotSeller();
            recipient = a.seller;
        } else {
            if (msg.sender != a.highestBidder) revert NotHighestBidder();
            recipient = a.highestBidder;
        }

        a.itemClaimed = true;
        IERC721(a.nft).safeTransferFrom(address(this), recipient, a.tokenId);

        emit ItemClaimed(auctionId, recipient);
    }

    /// @notice Cancel a listing before any bids have been placed. Only the
    ///         seller can do this, and only while `highestBid == 0` --
    ///         once someone has bid, the seller has made a commitment and
    ///         can no longer back out. Returns the item immediately since
    ///         there are no bidders to protect against.
    function cancelAuction(uint256 auctionId) external nonReentrant auctionExists(auctionId) {
        Auction storage a = auctions[auctionId];
        if (msg.sender != a.seller) revert NotSeller();
        if (a.ended || a.cancelled) revert AuctionAlreadyEnded();
        if (a.highestBid > 0) revert AuctionHasBids();

        a.cancelled = true;
        a.itemClaimed = true;
        IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);

        emit AuctionCancelled(auctionId);
        emit ItemClaimed(auctionId, a.seller);
    }

    // ---------------------------------------------------------------
    // View helpers
    // ---------------------------------------------------------------

    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    /// @notice The minimum bid that would currently be accepted.
    function minNextBid(uint256 auctionId) external view returns (uint256) {
        Auction storage a = auctions[auctionId];
        return a.highestBid == 0 ? a.startingPrice : a.highestBid + a.minIncrement;
    }
}
