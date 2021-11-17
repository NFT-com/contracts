// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../lib/LibAsset.sol";

abstract contract ITransferExecutor {
    event Transfer(LibAsset.Asset asset, address from, address to);

    function transfer(
        LibAsset.Asset memory asset,
        address from,
        address to
    ) internal virtual;
}
