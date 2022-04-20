// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../lib/LibAsset.sol";

interface ITransferProxy {
<<<<<<< HEAD:contracts/marketplace/interfaces/ITransferProxy.sol
    event OperatorChange(address indexed contractAddress, address indexed operator, bool value);
    
=======
    event AddOperator(address operator);
    event RemoveOperator(address operator);

>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398:contracts/Exchanage/interfaces/ITransferProxy.sol
    function transfer(
        LibAsset.Asset calldata asset,
        address from,
        address to
    ) external;
}
