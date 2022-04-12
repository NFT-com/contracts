// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../lib/LibAsset.sol";

interface ITransferProxy {
    event AddOperator(address operator);
    event RemoveOperator(address operator);

    function transfer(
        LibAsset.Asset calldata asset,
        address from,
        address to
    ) external;
}
