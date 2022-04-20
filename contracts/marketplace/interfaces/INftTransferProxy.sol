// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface INftTransferProxy {
<<<<<<< HEAD:contracts/marketplace/interfaces/INftTransferProxy.sol
    event OperatorChange(address indexed contractAddress, address indexed operator, bool value);
=======
    event AddOperator(address operator);
    event RemoveOperator(address operator);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398:contracts/Exchanage/interfaces/INftTransferProxy.sol

    function erc721safeTransferFrom(
        IERC721Upgradeable token,
        address from,
        address to,
        uint256 tokenId
    ) external;

    function erc1155safeTransferFrom(
        IERC1155Upgradeable token,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;
}
