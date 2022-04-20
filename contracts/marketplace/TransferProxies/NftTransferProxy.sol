// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/INftTransferProxy.sol";

contract NftTransferProxy is INftTransferProxy, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    mapping(address => bool) operators;

    function initialize() external initializer {
        __UUPSUpgradeable_init();
        __Context_init_unchained();
        __Ownable_init_unchained();
    }

    function erc721safeTransferFrom(
        IERC721Upgradeable token,
        address from,
        address to,
        uint256 tokenId
    ) external override onlyOperator {
        token.safeTransferFrom(from, to, tokenId);
    }

    function erc1155safeTransferFrom(
        IERC1155Upgradeable token,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override onlyOperator {
        token.safeTransferFrom(from, to, id, value, data);
    }

    function addOperator(address operator) external onlyOwner {
        operators[operator] = true;
        emit OperatorChange(address(this), operator, true);
    }

    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
        emit OperatorChange(address(this), operator, false);
    }

    modifier onlyOperator() {
        require(operators[_msgSender()], "OperatorRole: caller is not the operator");
        _;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
