// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MarketplaceRegistry is Initializable, UUPSUpgradeable {
    address public owner;

    struct TradeDetails {
        uint256 marketId;
        uint256 value;
        bytes tradeData;
    }

    struct Marketplace {
        address proxy;
        bool isLib;
        bool isActive;
    }

    Marketplace[] public marketplaces;

    function _onlyOwner() private view {
        require(msg.sender == owner);
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function initialize() public initializer {
        __UUPSUpgradeable_init();

        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    function addMarketplace(address proxy, bool isLib) external onlyOwner {
        marketplaces.push(Marketplace(proxy, isLib, true));
    }

    function setMarketplaceStatus(uint256 marketId, bool newStatus) external onlyOwner {
        Marketplace storage market = marketplaces[marketId];
        market.isActive = newStatus;
    }

    function setMarketplaceProxy(uint256 marketId, address newProxy, bool isLib) external onlyOwner {
        Marketplace storage market = marketplaces[marketId];
        market.proxy = newProxy;
        market.isLib = isLib;
    }
}
