//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interface/IMerkleDistributorProfile.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// From: https://github.com/Uniswap/merkle-distributor/blob/master/contracts/MerkleDistributor.sol

interface IProfileAuction {
    function genesisKeyMerkleClaim(
        uint256 tokenId,
        string memory profileUrl,
        address recipient
    ) external returns (bool);
}

contract MerkleDistributorProfile is IMerkleDistributorProfile {
    address public immutable override profileAuction;
    bytes32 public immutable override merkleRoot;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(address profileAuction_, bytes32 merkleRoot_) {
        profileAuction = profileAuction_;
        merkleRoot = merkleRoot_;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(
        uint256 index,
        uint256 tokenId,
        string memory profileUrl,
        bytes32[] calldata merkleProof
    ) external override {
        require(!isClaimed(index), "MerkleDistributorProfile: Drop already claimed.");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, tokenId, profileUrl));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), "MerkleDistributorProfile: Invalid proof.");

        _setClaimed(index);
        require(
            IProfileAuction(profileAuction).genesisKeyMerkleClaim(tokenId, profileUrl, msg.sender),
            "MerkleDistributorProfile: Failed to claim."
        );

        emit Claimed(index, tokenId, profileUrl);
    }
}
