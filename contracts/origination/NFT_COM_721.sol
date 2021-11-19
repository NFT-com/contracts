// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// each new mint is assign a random tokenId, instead of sequentially incrementing
// this is prevent potential conflicts in ordering if lazy mints for 721s succeed or fail
// the tokenId is between 0 - MAX_UINT => (2 ^ 256) - 1
// each time a new NFT is lazy minted, the server makes sure the rand tokenId != any current tokenId

// contract for minting custom 721s on NFT.com
// default contract for origination and lazy-mints
abstract contract NFT_COM_721 is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    function initialize() public initializer {}
}
