// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

struct Bid {
    uint256 _nftTokens;                 // number of nft tokens associated with bid
    uint256 _blockMinted;               // block bid is minted
    string _profileURI;                 // profile url
    uint256 _blockWait;                 // minimum wait time before nft tokens can be unlocked
}

// a new bonding contract is created with every new profile created
interface INftProfileV1 {
    function createProfile(
        address receiver,
        uint256 _nftTokens,
        string memory _profileURI,
        uint256 _blockWait,
        uint256 _blockMinted
    ) external;

    function tokenUsed(string memory _string) external view returns (bool);
    function profileDetails(uint256 tokenId) external view returns (Bid memory);
}