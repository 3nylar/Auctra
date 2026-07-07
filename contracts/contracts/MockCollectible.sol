// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title MockCollectible
/// @notice A simple, freely mintable ERC-721 used as demo items for Auctra
///         auctions on a public test network. Anyone can mint themselves an
///         item to list, the same way MockERC20's faucet works in the
///         companion Liquidity Pool Simulator project -- this exists purely
///         so trying the auction house never requires sourcing a real NFT.
contract MockCollectible is ERC721 {
    uint256 public nextTokenId;
    mapping(uint256 => string) private _tokenNames;

    event Minted(address indexed to, uint256 indexed tokenId, string name);

    constructor() ERC721("Auctra Demo Collectible", "ADEMO") {}

    /// @notice Mint a new demo item to yourself with a display name of your
    ///         choosing (e.g. "Vintage Synth #1"). Unrestricted by design --
    ///         this is a valueless demo token on a test network.
    function mint(string calldata name) external returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _tokenNames[tokenId] = name;
        emit Minted(msg.sender, tokenId, name);
    }

    function nameOf(uint256 tokenId) external view returns (string memory) {
        return _tokenNames[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(
            abi.encodePacked("data:application/json;utf8,{\"name\":\"", _tokenNames[tokenId], "\"}")
        );
    }
}
