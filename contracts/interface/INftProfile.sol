// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface INftProfile {
    function createProfile(address receiver, string memory _profileURI) external;

    function tokenUsed(string memory _string) external view returns (bool);
}
