// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

// a new bonding contract is created with every new profile created
interface ICreatorCoin {
    function performAction(
        uint256,
        address,
        address,
        uint256,
        uint256,
        uint256,
        uint256
    ) external;
}
