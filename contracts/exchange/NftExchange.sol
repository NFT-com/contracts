// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import "./lib/LibSignature.sol";
import "./interfaces/IERC1271.sol";
import "./helpers/TransferExecutor.sol";

contract NftExchange is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, TransferExecutor {
    using AddressUpgradeable for address;

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 private constant UINT256_MAX = 2**256 - 1;
    bytes4 internal constant MAGICVALUE = 0x1626ba7e; // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized order, by hash
    mapping(bytes32 => bool) public approvedOrders; // order verified by on-chain approval (optional)

    //events
    event Cancel(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
    event Approval(bytes32 hash, address maker, LibAsset.AssetType makeAssetType, LibAsset.AssetType takeAssetType);
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

    function initialize(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        address _stakingContract
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __TransferExecutor_init_unchained(_transferProxy, _erc20TransferProxy, _stakingContract, 250);
        __Ownable_init();
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

    /**
     * @dev function converting v r s into bytes32 signature via concat method
     */
    function concatVRS(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bytes memory) {
        return LibSignature.concatVRS(v, r, s);
    }

    /**
     * @dev function converting v r s into bytes32 signature via concat method
     */
    function recoverVRS(bytes memory signature)
        public
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        return LibSignature.recoverVRS(signature);
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

    function cancel(LibSignature.Order memory order) external nonReentrant {
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
    function approveOrder_(LibSignature.Order memory order) external nonReentrant {
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
        return (sellOrder.takeAsset.value != 0) && (sellOrder.taker == address(0) || sellOrder.taker == buyer);
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
    ) external payable nonReentrant {
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
    ) external payable nonReentrant {
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
}
