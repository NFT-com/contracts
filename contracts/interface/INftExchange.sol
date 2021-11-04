// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

// interface for NftExchange
interface INftExchange {
    function whitelistERC20(address) external view returns (bool);
}
