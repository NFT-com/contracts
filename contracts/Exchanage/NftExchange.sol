// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./lib/LibSignature.sol";
import "./interfaces/IERC20TransferProxy.sol";
import "./interfaces/INftTransferProxy.sol";
import "./interfaces/ITransferProxy.sol";
import "./interfaces/ITransferExecutor.sol";

contract NftExchange is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeMathUpgradeable for uint256;

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 private constant UINT256_MAX = 2**256 - 1;

    address public owner;
    mapping(bytes32 => uint256) public fills; // state of the orders
    mapping(bytes4 => address) proxies;
    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized order, by hash
    mapping(bytes32 => bool) public approvedOrders; // order verified by on-chain approval (optional)

    //events
    event ProxyChange(bytes4 indexed assetType, address proxy);
    event Cancel(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Approval(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Transfer(LibAsset.Asset asset, address from, address to, bytes4 transferDirection, bytes4 transferType);
    event Match(
        bytes32 leftHash,
        bytes32 rightHash,
        address leftMaker,
        address rightMaker,
        uint256 newLeftFill,
        uint256 newRightFill,
        LibAsset.AssetType leftAsset,
        LibAsset.AssetType rightAsset
    );

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function initialize() public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function requireValidOrder(LibSignature.Order memory order, Sig memory sig) internal view returns (bytes32) {
        bytes32 hash = LibSignature.getStructHash(order);
        require(validateOrder(hash, order, sig));
        return hash;
    }

    function validateOrder(bytes32 hash, LibSignature.Order memory order, Sig memory sig) internal view returns (bool) {
        LibSignature.validate(order); // validates start and end time

        if (cancelledOrFinalized[hash]) {
            return false;
        }

        if (approvedOrders[hash]) {
            return true;
        }

        bytes32 hashV4 = LibSignature._hashTypedDataV4Exchange(hash);
        if (ECDSAUpgradeable.recover(hashV4, sig.v, sig.r, sig.s) == order.maker) {
            return true;
        }

        return false;
    }

    /**
     * @dev public facing function that validates an order with a signature
     * @param order a buy or sell order
     * @param v
     * @param r
     * @param s
     */
    function validateOrder_(
        LibSignature.Order memory order,
        uint8 v,
        bytes32 r,
        bytes32 s
        
    ) public view returns (bool) {
        bytes32 hash = LibSignature.getStructHash(order);
        return validateOrder(hash, order, Sig(v, r, s));
    }

    function cancel(LibSignature.Order memory order) external {
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order);
        cancelledOrFinalized[hash] = true;
        emit Cancel(hash, order.maker, order.makeAsset.assetType, order.takeAsset.assetType);
    }

    /**
     * @dev Approve an bid. Must be called by the _owner of the bid
     * @param _nftTokens nft tokens for bid
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     */
    function approveOrder_(
        LibSignature.Order memory order
    ) internal {
        // checks
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order);
        require(!approvedOrders[hash]); // Assert bid has not already been approved.

        // effects
        approvedOrders[hash] = true; // Mark bid as approved.

        emit Approval(hash, order.maker, order.makeAsset.assetType, order.takeAsset.assetType);
    }

    /**
     * @dev validateMatch makes sure two orders (on sell side and buy side) match correctly
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch(
        LibSignature.Order memory sellOrder,
        LibSignature.Order memory buyOrder
    ) internal returns (bool) {
                // token denominating sell order listing
        return  (sellOrder.takeAsset.assetType.assetClass == buyOrder.makeAsset.assetType.assetClass) &&
                // asset being sold
                (sellOrder.makeAsset.assetType.assetClass == buyOrder.takeAsset.assetType.assetClass) &&
                // sellOrder taker must be valid
                (sellOrder.taker == address(0) || sellOrder.taker == buyOrder.maker) &&
                // buyOrder taker must be valid
                (buyOrder.taker == address(0) || buyOrder.taker == sellOrder.maker);
                // TODO: Add Royalties + Fees
    }

    /**
     * @dev public facing function to make sure orders can execute
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch_(
        LibSignature.Order memory sellOrder,
        LibSignature.Order memory buyOrder
    ) public view returns (bool) {
        return validateMatch(sellOrder, buyOrder);
    }

    /**
     * @dev executeSwap takes two orders and executes them together
     * @param sellOrder the listing
     * @param buyOrder bids for a listing
     * @param v array of v sig, index 0 = sellOrder, index 1 = buyOrder
     * @param r array of r sig, index 0 = sellOrder, index 1 = buyOrder
     * @param s array of s sig, index 0 = sellOrder, index 1 = buyOrder
     */
    function executeSwap(
        LibSignature.Order memory sellOrder,
        LibSignature.Order memory buyOrder,
        uint8[2] calldata v,
        bytes32[2] calldata r,
        bytes32[2] calldata s
    ) external payable {
        // checks
        bytes32 sellHash = requireValidOrder(
            sellOrder,
            Sig(v[0], r[0], s[0])
        );

        bytes32 buyHash = requireValidOrder(
            buyOrder,
            Sig(v[1], r[1], s[1])
        );

        require(validateMatch(sellOrder, buyOrder));

        // effects
        if (msg.sender != buyOrder.maker) {
            cancelledOrFinalized[buyHash] = true;
        }
        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        // interactions (i.e. perform swap)
    }

    // Transfer Executor
    function setTransferProxy(bytes4 assetType, address proxy) external onlyOwner {
        proxies[assetType] = proxy;
        emit ProxyChange(assetType, proxy);
    }

    function transferEth(address to, uint256 value) internal {
        (bool success, ) = to.call{ value: value }("");
        require(success, "transfer failed");
    }

    function transfer(
        LibAsset.Asset memory asset,
        address from,
        address to,
        bytes4 transferDirection,
        bytes4 transferType
    ) internal override {
        if (asset.assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
            to.transferEth(asset.value);
        } else if (asset.assetType.assetClass == LibAsset.ERC20_ASSET_CLASS) {
            address token = abi.decode(asset.assetType.data, (address));
            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                to,
                asset.value
            );
        } else if (asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS) {
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            require(asset.value == 1, "erc721 value error");
            INftTransferProxy(proxies[LibAsset.ERC721_ASSET_CLASS]).erc721safeTransferFrom(
                IERC721Upgradeable(token),
                from,
                to,
                tokenId
            );
        } else if (asset.assetType.assetClass == LibAsset.ERC1155_ASSET_CLASS) {
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            INftTransferProxy(proxies[LibAsset.ERC1155_ASSET_CLASS]).erc1155safeTransferFrom(
                IERC1155Upgradeable(token),
                from,
                to,
                tokenId,
                asset.value,
                ""
            );
        } else {
            ITransferProxy(proxies[asset.assetType.assetClass]).transfer(asset, from, to);
        }
        emit Transfer(asset, from, to, transferDirection, transferType);
    }
}
