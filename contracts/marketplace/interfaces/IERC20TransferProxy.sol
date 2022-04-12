// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20TransferProxy {
    event AddOperator(address operator);
    event RemoveOperator(address operator);

    function erc20safeTransferFrom(
        IERC20Upgradeable token,
        address from,
        address to,
        uint256 value
    ) external;
}
