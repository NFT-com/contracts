// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// error InactiveMarket();

contract NftAggregator is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct TradeDetails {
        uint256 marketId; // marketId
        uint256 value; // msg.value if needed
        bytes tradeData; // data for call option
    }

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

    function _checkCallResult(bool _success) internal pure {
        if (!_success) {
            assembly {
                // revert reason from call
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    function purchaseLooksrare(TradeDetails[] memory _tradeDetails) external nonReentrant {
        for (uint256 i = 0; i < _tradeDetails.length; ) {
            (bool success, ) = address(0x1AA777972073Ff66DCFDeD85749bDD555C0665dA).call{
                value: _tradeDetails[i].value
            }(_tradeDetails[i].tradeData);

            _checkCallResult(success);

            unchecked {
                ++i;
            }
        }
    }
}
