// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

// interface for nftProfileContract

// a new bonding contract is created with every new profile created
interface ICreatorBondingCurve {
    function getPrice(
        uint256,
        address,
        uint256
    ) external view returns (uint256);
}
