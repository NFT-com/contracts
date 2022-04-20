// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../lib/LibAsset.sol";

interface ITransferProxy {
    event OperatorChange(address indexed contractAddress, address indexed operator, bool value);
    
    function transfer(
        LibAsset.Asset calldata asset,
        address from,
        address to
    ) external;
}
