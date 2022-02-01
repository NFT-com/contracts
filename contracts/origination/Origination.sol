// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../oz_modified/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// contract for minting custom NFTs
abstract contract Origination is Initializable, ERC1155Upgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    function initialize() public initializer {
        // boilerplate base URI
        __ERC1155_init("https://api.nft.com/metadata/0x495f947276749Ce646f68AC8c248420045cb7b5e/{id}");
    }
}
