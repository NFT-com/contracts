// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./lib/LibSignature.sol";
import "./interfaces/IERC20TransferProxy.sol";
import "./interfaces/INftTransferProxy.sol";
import "./interfaces/ITransferProxy.sol";
import "./interfaces/IERC1271.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

contract NftExchange is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 private constant UINT256_MAX = 2**256 - 1;

    // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    address public owner;
    address public stakingContract;
    uint256 public protocolFee; // value 0 - 2000, where 2000 = 20% fees, 100 = 1%
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    mapping(bytes4 => address) proxies;
    mapping(address => bool) public whitelistERC20; // whitelist of supported ERC20s (to ensure easy of fee calculation)
    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized order, by hash
    mapping(bytes32 => bool) public approvedOrders; // order verified by on-chain approval (optional)

    //events
    event ProtocolFeeChange(uint256 fee);
    event ProxyChange(bytes4 indexed assetType, address proxy);
    event Cancel(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Approval(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Transfer(LibAsset.Asset asset, address from, address to);
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

    function initialize(INftTransferProxy _transferProxy, IERC20TransferProxy _erc20TransferProxy) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        proxies[LibAsset.ERC20_ASSET_CLASS] = address(_erc20TransferProxy);
        proxies[LibAsset.ERC721_ASSET_CLASS] = address(_transferProxy);
        proxies[LibAsset.ERC1155_ASSET_CLASS] = address(_transferProxy);

        owner = msg.sender;
        protocolFee = 250; // initial fee = 2.5%
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @dev internal functions for returning struct hash, after verifying it is valid
     * @param order the order itself
     * @param sig the struct sig (contains VRS)
     */
    function requireValidOrder(LibSignature.Order memory order, Sig memory sig) internal view returns (bytes32) {
        bytes32 hash = LibSignature.getStructHash(order);
        require(validateOrder(hash, order, sig));
        return hash;
    }

    function changeProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee < 2000, "NFT.COM: 20% MAX");
        protocolFee = _fee;
        emit ProtocolFeeChange(_fee);
    }

    function concatVRS(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bytes memory) {
        bytes memory result = new bytes(65);
        bytes1 v1 = bytes1(v);

        assembly {
            mstore(add(result, 0x20), r)
            mstore(add(result, 0x40), s)
            mstore(add(result, 0x60), v1)
        }

        return result;
    }

    function recoverVRS(bytes memory signature)
        public
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(signature.length == 65, "NFT.COM: !65 length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        return (v, r, s);
    }

    /**
     * @dev internal function for validating a buy or sell order
     * @param hash the struct hash for a bid
     * @param order the order itself
     * @param sig the struct sig (contains VRS)
     */
    function validateOrder(
        bytes32 hash,
        LibSignature.Order memory order,
        Sig memory sig
    ) internal view returns (bool) {
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

        // EIP 1271 Contract Validation
        if (order.maker.isContract()) {
            require(
                IERC1271(order.maker).isValidSignature(hashV4, concatVRS(sig.v, sig.r, sig.s)) == MAGICVALUE,
                "contract order signature verification error"
            );

            return true;
        }

        return false;
    }

    /**
     * @dev public facing function that validates an order with a signature
     * @param order a buy or sell order
     * @param v sigV
     * @param r sigR
     * @param s sigS
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
     * @dev Approve an order
     * @param order the order (buy or sell) in question
     */
    function approveOrder_(LibSignature.Order memory order) internal {
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
     * @dev validateBuyNow makes sure a buyer can fulfill the sellOrder and that the sellOrder is formatted properly
     * @param sellOrder the listing
     * @param buyer potential executor of sellOrder
     */
    function validateBuyNow(LibSignature.Order memory sellOrder, address buyer) internal pure returns (bool) {
        return
            (sellOrder.takeAsset.value != 0) &&
            (sellOrder.taker == address(0) || sellOrder.taker == buyer);
    }

    /**
     * @dev validateMatch makes sure two orders (on sell side and buy side) match correctly
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch(LibSignature.Order memory sellOrder, LibSignature.Order memory buyOrder)
        internal
        pure
        returns (bool)
    {
        uint256 minimumBidValue = abi.decode(sellOrder.data, (uint256));

        return
            // token denominating sell order listing
            (sellOrder.takeAsset.assetType.assetClass == buyOrder.makeAsset.assetType.assetClass) &&
            // asset being sold
            (sellOrder.makeAsset.assetType.assetClass == buyOrder.takeAsset.assetType.assetClass) &&
            // sellOrder taker must be valid
            (sellOrder.taker == address(0) || sellOrder.taker == buyOrder.maker) &&
            // buyOrder taker must be valid
            (buyOrder.taker == address(0) || buyOrder.taker == sellOrder.maker) &&
            // buyOrder must be within bounds
            (buyOrder.makeAsset.value >= minimumBidValue);
    }

    /**
     * @dev public facing function to make sure orders can execute
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch_(LibSignature.Order memory sellOrder, LibSignature.Order memory buyOrder)
        public
        pure
        returns (bool)
    {
        return validateMatch(sellOrder, buyOrder);
    }

    function checkRoyalties(address _contract) internal view returns (bool) {
        bool success = IERC165Upgradeable(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
    }

    /**
     * @dev functions that allows anyone to execute a sell order that has a specified price > 0
     * @param sellOrder the listing
     * @param v vSig
     * @param r rSig
     * @param s sSig
     */
    function buyNow(
        LibSignature.Order memory sellOrder,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable {
        // checks
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v, r, s));

        require(validateBuyNow(sellOrder, msg.sender));

        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        // interactions (i.e. perform swap)
        // these two functions also transfer fees AND royalties
        transfer(sellOrder.takeAsset, msg.sender, sellOrder.maker); // send denominated asset to seller from buyer
        transfer(sellOrder.makeAsset, sellOrder.maker, msg.sender); // send listed asset to buyer from seller
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
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v[0], r[0], s[0]));

        bytes32 buyHash = requireValidOrder(buyOrder, Sig(v[1], r[1], s[1]));

        require(validateMatch(sellOrder, buyOrder));

        // effects

        // reasoning is that anyone can match orders together
        // case 1: if buyer executes, sellOrder is used
        // case 2: if seller executes, buyOrder is used
        // case 3: if 3rd party executes, both orders are used
        // in both case 1 and 2:
        //  the other order is not set "used" as it cannot match with any other order in the system
        //  this is mainly done to save on gas costs
        if (msg.sender != buyOrder.maker) {
            cancelledOrFinalized[buyHash] = true;
        }
        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        // interactions (i.e. perform swap)
        // these two functions also transfer fees AND royalties
        transfer(buyOrder.makeAsset, buyOrder.maker, sellOrder.maker); // send denominated asset to seller from buyer
        transfer(sellOrder.makeAsset, sellOrder.maker, buyOrder.maker); // send listed asset to buyer from seller
    }

    function setTransferProxy(bytes4 assetType, address proxy) external onlyOwner {
        proxies[assetType] = proxy;
        emit ProxyChange(assetType, proxy);
    }

    /**
     * @dev internal function for transferring ETH w/ fees
     * @notice fees are being sent in addition to base ETH price
     * @param to counterparty receiving ETH for transaction
     * @param value base value of ETH in wei
     */
    function transferEth(address to, uint256 value) internal {
        // ETH Fee
        (bool success1, ) = stakingContract.call{ value: value.mul(protocolFee).div(10000) }("");
        (bool success2, ) = to.call{ value: value }("");
        require(success1 && success2, "NFT.COM: transfer failed");
    }

    /**
     * @dev multi-asset transfer function
     * @param asset the asset being transferred
     * @param from address where asset is being sent from
     * @param to address receiving said asset
     */
    function transfer(
        LibAsset.Asset memory asset,
        address from,
        address to
    ) internal {
        if (asset.assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
            transferEth(to, asset.value);
        } else if (asset.assetType.assetClass == LibAsset.ERC20_ASSET_CLASS) {
            address token = abi.decode(asset.assetType.data, (address));
            require(whitelistERC20[token], "NFT.COM: ERC20 NOT SUPPORTED");

            // ERC20 Fee
            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                stakingContract,
                asset.value.mul(protocolFee).div(10000)
            );

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
            // non standard NFTs
            ITransferProxy(proxies[asset.assetType.assetClass]).transfer(asset, from, to);
        }
        emit Transfer(asset, from, to);
    }
}
