// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20TransferProxy {
<<<<<<< HEAD:contracts/marketplace/interfaces/IERC20TransferProxy.sol
    event OperatorChange(address indexed contractAddress, address indexed operator, bool value);
    
=======
    event AddOperator(address operator);
    event RemoveOperator(address operator);

>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398:contracts/Exchanage/interfaces/IERC20TransferProxy.sol
    function erc20safeTransferFrom(
        IERC20Upgradeable token,
        address from,
        address to,
        uint256 value
    ) external;
}
