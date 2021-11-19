// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// contract for minting custom NFTs
// has minting access to the custom 721 and 1155 contracts
abstract contract OriginationNftCom is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    function initialize() public initializer {}
}
