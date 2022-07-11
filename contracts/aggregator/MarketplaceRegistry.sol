// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MarketplaceRegistry is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    address public owner;

    function _onlyOwner() private view {
        require(msg.sender == owner);
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function initialize() public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    function addMarketplace(address _contract) external onlyOwner {
        // TODO
    }
}
