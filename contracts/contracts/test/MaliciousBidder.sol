// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAuctionHouseForAttack {
    function bid(uint256 auctionId) external payable;
    function withdraw(uint256 auctionId) external;
}

/// @title MaliciousBidder
/// @notice Test-only mock that (a) reverts on receiving ETH to simulate a
///         refund-griefing attacker, and (b) attempts to reenter the
///         AuctionHouse from within its receive() to simulate a
///         reentrancy attack. Used exclusively by the test suite.
contract MaliciousBidder {
    IAuctionHouseForAttack public immutable house;
    uint256 public targetAuctionId;
    bool public reenterOnReceive;
    bool public rejectEth;

    constructor(address _house) {
        house = IAuctionHouseForAttack(_house);
    }

    function setBehavior(bool _rejectEth, bool _reenterOnReceive, uint256 _auctionId) external {
        rejectEth = _rejectEth;
        reenterOnReceive = _reenterOnReceive;
        targetAuctionId = _auctionId;
    }

    function placeBid(uint256 auctionId, uint256 amount) external payable {
        house.bid{value: amount}(auctionId);
    }

    function attemptWithdraw(uint256 auctionId) external {
        house.withdraw(auctionId);
    }

    receive() external payable {
        if (rejectEth) {
            revert("MaliciousBidder: rejecting ETH");
        }
        if (reenterOnReceive) {
            // Attempt to withdraw again mid-transfer -- should fail because
            // pendingWithdrawals was already zeroed before this call
            // (checks-effects-interactions), and/or be blocked by
            // ReentrancyGuard.
            house.withdraw(targetAuctionId);
        }
    }
}
