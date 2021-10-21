// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./Exchange.sol";

contract NftComExchange is Initializable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    Exchange
{
    using SafeMathUpgradeable for uint256;

    address public owner;

    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    function initialize(
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}