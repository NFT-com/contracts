// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface INftProfile {
    function createProfile(address receiver, string memory _profileURI, uint256 _expiry) external;

    function extendRent(string memory _profileURI, uint256 _expiry) external;

    function purchaseExpiredProfile(
        string memory _profileURI,
        uint256 _duration,
        address _receiver
    ) external;

    function tokenUsed(string memory _string) external view returns (bool);
}
