// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
<<<<<<< HEAD
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../interfaces/IERC20TransferProxy.sol";

contract ERC20TransferProxy is IERC20TransferProxy, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
=======
import "../interfaces/IERC20TransferProxy.sol";

contract ERC20TransferProxy is IERC20TransferProxy, Initializable, UUPSUpgradeable, OwnableUpgradeable {
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    mapping(address => bool) operators;

    function initialize() external initializer {
        __UUPSUpgradeable_init();
        __Context_init_unchained();
        __Ownable_init_unchained();
    }

    function erc20safeTransferFrom(
        IERC20Upgradeable token,
        address from,
        address to,
        uint256 value
    ) external override onlyOperator {
<<<<<<< HEAD
        token.safeTransferFrom(from, to, value);
=======
        require(token.transferFrom(from, to, value), "failure while transferring");
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function addOperator(address operator) external onlyOwner {
        operators[operator] = true;
<<<<<<< HEAD
        emit OperatorChange(address(this), operator, true);
=======
        emit AddOperator(operator);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
<<<<<<< HEAD
        emit OperatorChange(address(this), operator, true);
=======
        emit RemoveOperator(operator);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    modifier onlyOperator() {
        require(operators[_msgSender()], "OperatorRole: caller is not the operator");
        _;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
