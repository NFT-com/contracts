// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NftAggregator is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct Order {
        address contractAddress;
        uint256 tokenId;
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

    /**
     * @dev aggregated purchase function
     * @param orders (one or more orders on exchanges)
     */
    function batchPurchase(Order[] calldata orders) external nonReentrant {
        // TODO
    }

    function purchaseOpensea() external nonReentrant {

    }

    function purchaseLooksrare() external nonReentrant {
        // matchAskWithTakerBid
        // [
        //     "bool", 
        //     "address", 
        //     "uint256", 
        //     "uint256", 
        //     "uint256", 
        //     "bytes", 
        //     "bool", 
        //     "address", 
        //     "address", 
        //     "uint256", 
        //     "uint256", 
        //     "uint256", 
        //     "address", 
        //     "address", 
        //     "uint256", 
        //     "uint256", 
        //     "uint256", 
        //     "uint256", 
        //     "bytes", 
        //     "uint8", 
        //     "bytes32", 
        //     "bytes32"
        // ]
        // struct TakerOrder {
        //     bool isOrderAsk; // true --> ask / false --> bid
        //     address taker; // msg.sender
        //     uint256 price; // final price for the purchase
        //     uint256 tokenId;
        //     uint256 minPercentageToAsk; // // slippage protection (9000 --> 90% of the final price must return to ask)
        //     bytes params; // other params (e.g., tokenId)
        // }
        // struct MakerOrder {
        //     bool isOrderAsk; // true --> ask / false --> bid
        //     address signer; // signer of the maker order
        //     address collection; // collection address
        //     uint256 price; // price (used as )
        //     uint256 tokenId; // id of the token
        //     uint256 amount; // amount of tokens to sell/purchase (must be 1 for ERC721, 1+ for ERC1155)
        //     address strategy; // strategy for trade execution (e.g., DutchAuction, StandardSaleForFixedPrice)
        //     address currency; // currency (e.g., WETH)
        //     uint256 nonce; // order nonce (must be unique unless new maker order is meant to override existing one e.g., lower ask price)
        //     uint256 startTime; // startTime in timestamp
        //     uint256 endTime; // endTime in timestamp
        //     uint256 minPercentageToAsk; // slippage protection (9000 --> 90% of the final price must return to ask)
        //     bytes params; // additional parameters
        //     uint8 v; // v: parameter (27 or 28)
        //     bytes32 r; // r: parameter
        //     bytes32 s; // s: parameter
        // }
    }
}
