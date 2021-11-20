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

contract NftMarketplace is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, TransferExecutor {
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
    event Cancel(bytes32 hash, address maker, address taker);
    event Approval(bytes32 hash, address maker, address taker);
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
    function requireValidOrder(LibSignature.Order calldata order, Sig memory sig) internal view returns (bytes32) {
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
    function recoverVRS(bytes calldata signature)
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
        LibSignature.Order calldata order,
        Sig memory sig
    ) internal view returns (bool) {
        LibSignature.validate(order); // validates start and end time

        if (cancelledOrFinalized[hash]) {
            return false;
        }

        if (approvedOrders[hash]) {
            return true;
        }

        bytes32 hashV4 = LibSignature._hashTypedDataV4Marketplace(hash);

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
        LibSignature.Order calldata order,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (bool) {
        bytes32 hash = LibSignature.getStructHash(order);
        return validateOrder(hash, order, Sig(v, r, s));
    }

    function cancel(LibSignature.Order calldata order) external nonReentrant {
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order);
        cancelledOrFinalized[hash] = true;
        emit Cancel(hash, order.maker, order.taker);
    }

    /**
     * @dev Approve an order
     * @param order the order (buy or sell) in question
     */
    function approveOrder_(LibSignature.Order calldata order) external nonReentrant {
        // checks
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order);
        require(!approvedOrders[hash]); // Assert bid has not already been approved.

        // effects
        approvedOrders[hash] = true; // Mark bid as approved.

        emit Approval(hash, order.maker, order.taker);
    }

    /**
     * @dev validateBuyNow makes sure a buyer can fulfill the sellOrder and that the sellOrder is formatted properly
     * @param sellOrder the listing
     * @param buyer potential executor of sellOrder
     */
    function validateBuyNow(LibSignature.Order calldata sellOrder, address buyer) internal pure returns (bool) {
        require((sellOrder.taker == address(0) || sellOrder.taker == buyer), "NFT.com: buyer must be taker");

        require(sellOrder.makeAssets.length != 0, "NFT.com: seller make must > 0");

        return true;
    }

    /**
     *  @dev validateSingleAssetMatch1 makes sure two assets can be matched (same index in LibSignature array)
     *  @param buyTakeAsset what the buyer is hoping to take
     *  @param sellMakeAsset what the seller is hoping to make
     */
    function validateSingleAssetMatch1(LibAsset.Asset calldata buyTakeAsset, LibAsset.Asset calldata sellMakeAsset)
        internal
        pure
        returns (bool)
    {
        (uint256 sellMakeValue, ) = abi.decode(sellMakeAsset.data, (uint256, uint256));
        (uint256 buyTakeValue, ) = abi.decode(buyTakeAsset.data, (uint256, uint256));

        return
            // asset being sold
            (sellMakeAsset.assetType.assetClass == buyTakeAsset.assetType.assetClass) &&
            // sell value == buy take
            sellMakeValue == buyTakeValue;
    }

    /**
     * @dev validAssetTypeData checks if tokenIds are the same (only for NFTs)
     *  @param sellTakeAssetClass (bytes4 of type in LibAsset)
     *  @param buyMakeAssetTypeData assetTypeData for makeAsset on buyOrder
     *  @param sellTakeAssetTypeData assetTypeData for takeAsset on sellOrder
     */
    function validAssetTypeData(
        bytes4 sellTakeAssetClass,
        bytes memory buyMakeAssetTypeData,
        bytes memory sellTakeAssetTypeData
    ) internal pure returns (bool) {
        if (
            sellTakeAssetClass == LibAsset.ERC721_ASSET_CLASS ||
            sellTakeAssetClass == LibAsset.ERC1155_ASSET_CLASS ||
            sellTakeAssetClass == LibAsset.CRYPTO_PUNK ||
            sellTakeAssetClass == LibAsset.CRYPTO_KITTY
        ) {
            (address buyMakeAddress, uint256 buyMakeTokenId, ) = abi.decode(
                buyMakeAssetTypeData,
                (address, uint256, bool)
            );

            (address sellTakeAddress, uint256 sellTakeTokenId, bool sellTakeAllowAll) = abi.decode(
                sellTakeAssetTypeData,
                (address, uint256, bool)
            );

            require(buyMakeAddress == sellTakeAddress, "NFT.com: contracts must match");

            if (sellTakeAllowAll) {
                return true;
            } else {
                return buyMakeTokenId == sellTakeTokenId;
            }
        } else if (sellTakeAssetClass == LibAsset.ERC20_ASSET_CLASS) {
            return abi.decode(buyMakeAssetTypeData, (address)) == abi.decode(sellTakeAssetTypeData, (address));
        } else {
            // ETH has no contract so no need to verify
            // TODO: handle COLLECTION...
            return true;
        }
    }

    /**
     * @dev validateSingleAssetMatch2 makes sure two assets can be matched (same index in LibSignature array)
     *  @param sellTakeAsset what the seller is hoping to take
     *  @param buyMakeAsset what the buyer is hoping to make
     */
    function validateSingleAssetMatch2(LibAsset.Asset calldata sellTakeAsset, LibAsset.Asset calldata buyMakeAsset)
        internal
        pure
        returns (bool)
    {
        (uint256 buyMakeValue, ) = abi.decode(buyMakeAsset.data, (uint256, uint256));
        (, uint256 sellTakeMinValue) = abi.decode(sellTakeAsset.data, (uint256, uint256));

        return
            // token denominating sell order listing
            (sellTakeAsset.assetType.assetClass == buyMakeAsset.assetType.assetClass) &&
            // make sure tokenIds match if NFT AND contract address matches
            validAssetTypeData(
                sellTakeAsset.assetType.assetClass,
                buyMakeAsset.assetType.data,
                sellTakeAsset.assetType.data
            ) &&
            // buyOrder must be within bounds
            buyMakeValue >= sellTakeMinValue;

        // NOTE: sellTakeMin could be 0 and buyer could offer 0;
        // NOTE: (in case seller wants to make a list of optional assets to select from)
    }

    /**
     * @dev validateMatch makes sure two orders (on sell side and buy side) match correctly
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch(LibSignature.Order calldata sellOrder, LibSignature.Order calldata buyOrder)
        internal
        pure
        returns (bool)
    {
        // sellOrder taker must be valid
        require(
            (sellOrder.taker == address(0) || sellOrder.taker == buyOrder.maker) &&
                // buyOrder taker must be valid
                (buyOrder.taker == address(0) || buyOrder.taker == sellOrder.maker),
            "NFT.com: maker taker must match"
        );

        // must be selling something and make and take must match
        require(
            sellOrder.makeAssets.length != 0 && buyOrder.takeAssets.length == sellOrder.makeAssets.length,
            "NFT.com: sell maker must > 0"
        );

        // check if seller maker and buyer take match on every corresponding index
        for (uint256 i = 0; i < sellOrder.makeAssets.length; i++) {
            if (!validateSingleAssetMatch1(buyOrder.takeAssets[i], sellOrder.makeAssets[i])) {
                return false;
            }
        }

        // if seller's takeAssets = 0, that means seller doesn't make what buyer's makeAssets are, so ignore
        // if seller's takeAssets > 0, seller has a specified list
        if (sellOrder.takeAssets.length != 0) {
            require(sellOrder.takeAssets.length == buyOrder.makeAssets.length, "NFT.com: sellTake must match buyMake");
            // check if seller maker and buyer take match on every corresponding index
            for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
                if (!validateSingleAssetMatch2(sellOrder.takeAssets[i], buyOrder.makeAssets[i])) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * @dev public facing function to make sure orders can execute
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch_(LibSignature.Order calldata sellOrder, LibSignature.Order calldata buyOrder)
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
        LibSignature.Order calldata sellOrder,
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

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(sellOrder.takeAssets[i], msg.sender, sellOrder.maker);
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(sellOrder.makeAssets[j], sellOrder.maker, msg.sender);
        }
    }

    // /**
    //  * @dev lazyMint function that mints a NFT and immedietly exchanges it
    //  * @param sellOrder the listing
    //  * @param buyOrder bids for a listing
    //  * @param v array of v sig, index 0 = nftPermit for lister, index 1 = sellOrder, index 2 = buyOrder
    //  * @param r array of r sig, index 0 = nftPermit for lister, index 1 = sellOrder, index 2 = buyOrder
    //  * @param s array of s sig, index 0 = nftPermit for lister, index 1 = sellOrder, index 2 = buyOrder
    //  */
    // function lazyMint(
    //     LibSignature.Order calldata sellOrder,
    //     LibSignature.Order calldata buyOrder,
    //     uint8[3] calldata v,
    //     bytes32[3] calldata r,
    //     bytes32[3] calldata s
    // ) external payable nonReentrant {
    //     if (sellOrder.asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS) {
    //         // mint 721 to buyer
    //     } else if (sellOrder.asset.assetType.assetClass == LibAsset.ERC1155_ASSET_CLASS) {
    //         // mint 1155 to buyer
    //     } else {
    //         require(false, "NFT.com: UNSUPPORTED ASSET");
    //     }

    //     executeSwap(
    //         sellOrder,
    //         buyOrder,
    //         [v[1], v[2]],
    //         [r[1], r[2]],
    //         [s[1], s[2]]
    //     )
    // }

    /**
     * @dev executeSwap takes two orders and executes them together
     * @param sellOrder the listing
     * @param buyOrder bids for a listing
     * @param v array of v sig, index 0 = sellOrder, index 1 = buyOrder
     * @param r array of r sig, index 0 = sellOrder, index 1 = buyOrder
     * @param s array of s sig, index 0 = sellOrder, index 1 = buyOrder
     */
    function executeSwap(
        LibSignature.Order calldata sellOrder,
        LibSignature.Order calldata buyOrder,
        uint8[2] calldata v,
        bytes32[2] calldata r,
        bytes32[2] calldata s
    ) public payable nonReentrant {
        // checks
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v[0], r[0], s[0]));

        bytes32 buyHash = requireValidOrder(buyOrder, Sig(v[1], r[1], s[1]));

        require(validateMatch(sellOrder, buyOrder));

        // effects
        if (msg.sender != buyOrder.maker) {
            cancelledOrFinalized[buyHash] = true;
        }
        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < buyOrder.makeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(buyOrder.makeAssets[i], buyOrder.maker, sellOrder.maker);
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(sellOrder.makeAssets[j], sellOrder.maker, buyOrder.maker);
        }
    }
}
