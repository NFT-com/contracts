// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "./lib/LibSignature.sol";
import "./interfaces/IERC1271.sol";
import "./helpers/TransferExecutor.sol";

contract NftMarketplace is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, TransferExecutor {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;

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
    mapping(bytes32 => bool) private approvedOrders; // TODO: delete from mainnet
    mapping(bytes32 => uint256) private _approvedOrdersByNonce;
    mapping(address => uint256) public nonces; // nonce for each account

    //events
    event Cancel(bytes32 structHash, address indexed maker);
    event Approval(bytes32 structHash, address indexed maker);
    event NonceIncremented(address indexed maker, uint256 newNonce);
    event Match(
        bytes32 indexed makerStructHash,
        bytes32 indexed takerStructHash,
        LibSignature.AuctionType auctionType,
        Sig makerSig,
        Sig takerSig,
        bool privateSale
    );
    event Match2A(
        bytes32 indexed makerStructHash,
        address makerAddress,
        address takerAddress,
        uint256 start,
        uint256 end,
        uint256 nonce,
        uint256 salt
    );
    event Match2B(
        bytes32 indexed makerStructHash,
        bytes[] sellerMakerOrderAssetData,
        bytes[] sellerMakerOrderAssetTypeData,
        bytes4[] sellerMakerOrderAssetClass,
        bytes[] sellerTakerOrderAssetData,
        bytes[] sellerTakerOrderAssetTypeData,
        bytes4[] sellerTakerOrderAssetClass
    );
    event Match3A(
        bytes32 indexed takerStructHash,
        address makerAddress,
        address takerAddress,
        uint256 start,
        uint256 end,
        uint256 nonce,
        uint256 salt
    );
    event Match3B(
        bytes32 indexed takerStructHash,
        bytes[] buyerMakerOrderAssetData,
        bytes[] buyerMakerOrderAssetTypeData,
        bytes4[] buyerMakerOrderAssetClass,
        bytes[] buyerTakerOrderAssetData,
        bytes[] buyerTakerOrderAssetTypeData,
        bytes4[] buyerTakerOrderAssetClass
    );

    function initialize(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        address _cryptoKittyProxy,
        address _stakingContract
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __TransferExecutor_init_unchained(
            _transferProxy,
            _erc20TransferProxy,
            _cryptoKittyProxy,
            _stakingContract,
            100
        );
        __Ownable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @dev internal functions for returning struct hash, after verifying it is valid
     * @param order the order itself
     * @param sig the struct sig (contains VRS)
     */
    function requireValidOrder(
        LibSignature.Order calldata order,
        Sig memory sig,
        uint256 nonce
    ) internal view returns (bytes32) {
        bytes32 hash = LibSignature.getStructHash(order, nonce);
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

    // invalidate all previous unused nonce orders
    function incrementNonce() external {
        uint256 newNonce = ++nonces[msg.sender];
        emit NonceIncremented(msg.sender, newNonce);
    }

    function orderApproved(bytes32 hash) public view returns (bool approved) {
        return _approvedOrdersByNonce[hash] != 0;
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

        uint256 approvedOrderNoncePlusOne = _approvedOrdersByNonce[hash];
        if (approvedOrderNoncePlusOne != 0) {
            return approvedOrderNoncePlusOne == nonces[order.maker] + 1;
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
    ) public view returns (bool, bytes32) {
        bytes32 hash = LibSignature.getStructHash(order, nonces[order.maker]);
        return (validateOrder(hash, order, Sig(v, r, s)), hash);
    }

    function cancel(LibSignature.Order calldata order) external nonReentrant {
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order, nonces[order.maker]);
        cancelledOrFinalized[hash] = true;
        emit Cancel(hash, msg.sender);
    }

    /**
     * @dev Approve an order
     * @param order the order (buy or sell) in question
     */
    function approveOrder_(LibSignature.Order calldata order) external nonReentrant {
        // checks
        require(msg.sender == order.maker, "not a maker");
        require(order.salt != 0, "0 salt can't be used");
        bytes32 hash = LibSignature.getStructHash(order, nonces[order.maker]);

        /* Assert order has not already been approved. */
        require(_approvedOrdersByNonce[hash] == 0);

        // effects

        /* Mark order as approved. */
        _approvedOrdersByNonce[hash] = nonces[order.maker] + 1;

        emit Approval(hash, msg.sender);
    }

    /**
     * @dev validateBuyNow makes sure a buyer can fulfill the sellOrder and that the sellOrder is formatted properly
     * @param sellOrder the listing
     * @param buyer potential executor of sellOrder
     */
    function validateBuyNow(LibSignature.Order calldata sellOrder, address buyer) internal view returns (bool) {
        require((sellOrder.taker == address(0) || sellOrder.taker == buyer), "NFT.com: buyer must be taker");
        require(sellOrder.makeAssets.length != 0, "NFT.com: seller make must > 0");

        if (sellOrder.auctionType == LibSignature.AuctionType.Decreasing) {
            require(sellOrder.takeAssets.length == 1, "NFT.com: decreasing auction must have 1 take asset");
            require(
                (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ETH_ASSET_CLASS) ||
                    (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ERC20_ASSET_CLASS),
                "NFT.com: decreasing auction only supports ETH and ERC20"
            );

            require(sellOrder.start != 0 && sellOrder.start < block.timestamp, "NFT.com: start expired");
            require(sellOrder.end != 0 && sellOrder.end > block.timestamp, "NFT.com: end expired");
        }

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
     *  @param viewOnly is true when just not checking msg.value in the view function
     */
    function validAssetTypeData(
        bytes4 sellTakeAssetClass,
        bytes memory buyMakeAssetTypeData,
        bytes memory sellTakeAssetTypeData,
        uint256 buyMakeValue,
        bool viewOnly
    ) internal view returns (bool) {
        if (
            sellTakeAssetClass == LibAsset.ERC721_ASSET_CLASS ||
            sellTakeAssetClass == LibAsset.ERC1155_ASSET_CLASS ||
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
        } else if (sellTakeAssetClass == LibAsset.ETH_ASSET_CLASS) {
            // require sender
            require(
                viewOnly || msg.value >= buyMakeValue.add(buyMakeValue.mul(protocolFee).div(10000)),
                "NFT.com: insufficient ETH"
            );
            return true;
        } else {
            // should not come here
            return false;
        }
    }

    /**
     * @dev validateSingleAssetMatch2 makes sure two assets can be matched (same index in LibSignature array)
     *  @param sellTakeAsset what the seller is hoping to take
     *  @param buyMakeAsset what the buyer is hoping to make
     */
    function validateSingleAssetMatch2(
        LibAsset.Asset calldata sellTakeAsset,
        LibAsset.Asset calldata buyMakeAsset,
        bool viewOnly
    ) internal view returns (bool) {
        (uint256 buyMakeValue, ) = abi.decode(buyMakeAsset.data, (uint256, uint256));
        (, uint256 sellTakeMinValue) = abi.decode(sellTakeAsset.data, (uint256, uint256));

        return
            // token denominating sell order listing
            (sellTakeAsset.assetType.assetClass == buyMakeAsset.assetType.assetClass) &&
            // buyOrder must be within bounds
            buyMakeValue >= sellTakeMinValue &&
            // make sure tokenIds match if NFT AND contract address matches
            validAssetTypeData(
                sellTakeAsset.assetType.assetClass,
                buyMakeAsset.assetType.data,
                sellTakeAsset.assetType.data,
                buyMakeValue,
                viewOnly
            );

        // NOTE: sellTakeMin could be 0 and buyer could offer 0;
        // NOTE: (in case seller wants to make a list of optional assets to select from)
    }

    /**
     * @dev validateMatch makes sure two orders (on sell side and buy side) match correctly
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch(
        LibSignature.Order calldata sellOrder,
        LibSignature.Order calldata buyOrder,
        bool viewOnly
    ) internal view returns (bool) {
        // flag to ensuree ETH is not used multiple timese
        bool ETH_ASSET_USED = false;

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

        require(
            (sellOrder.auctionType == LibSignature.AuctionType.English) &&
                (buyOrder.auctionType == LibSignature.AuctionType.English),
            "NFT.com: auction type must match"
        );

        // check if seller maker and buyer take match on every corresponding index
        for (uint256 i = 0; i < sellOrder.makeAssets.length; i++) {
            if (!validateSingleAssetMatch1(buyOrder.takeAssets[i], sellOrder.makeAssets[i])) {
                return false;
            }

            // if ETH, seller must be sending ETH / calling
            if (sellOrder.makeAssets[i].assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
                require(!ETH_ASSET_USED, "NFT.com: ETH already used");
                require(viewOnly || msg.sender == sellOrder.maker, "NFT.com: seller must send ETH");
                ETH_ASSET_USED = true;
            }
        }

        // if seller's takeAssets = 0, that means seller doesn't make what buyer's makeAssets are, so ignore
        // if seller's takeAssets > 0, seller has a specified list
        if (sellOrder.takeAssets.length != 0) {
            require(sellOrder.takeAssets.length == buyOrder.makeAssets.length, "NFT.com: sellTake must match buyMake");
            // check if seller maker and buyer take match on every corresponding index
            for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
                if (!validateSingleAssetMatch2(sellOrder.takeAssets[i], buyOrder.makeAssets[i], viewOnly)) {
                    return false;
                }

                // if ETH, buyer must be sending ETH / calling
                if (buyOrder.makeAssets[i].assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
                    require(!ETH_ASSET_USED, "NFT.com: ETH already used");
                    require(viewOnly || msg.sender == buyOrder.maker, "NFT.com: buyer must send ETH");
                    ETH_ASSET_USED = true;
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
        view
        returns (bool)
    {
        return validateMatch(sellOrder, buyOrder, true);
    }

    function checkRoyalties(address _contract) internal view returns (bool) {
        bool success = IERC165Upgradeable(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
    }

    function getDecreasingPrice(LibSignature.Order memory sellOrder) public view returns (uint256) {
        require(sellOrder.auctionType == LibSignature.AuctionType.Decreasing, "NFT.com: auction type must match");
        require(sellOrder.takeAssets.length == 1, "NFT.com: sellOrder must have 1 takeAsset");
        require(
            (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ETH_ASSET_CLASS) ||
                (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ERC20_ASSET_CLASS),
            "NFT.com: decreasing auction only supports ETH and ERC20"
        );

        uint256 secondsPassed = 0;
        uint256 publicSaleDurationSeconds = sellOrder.end.sub(sellOrder.start);
        uint256 finalPrice;
        uint256 initialPrice;

        (initialPrice, finalPrice) = abi.decode(sellOrder.takeAssets[0].data, (uint256, uint256));

        secondsPassed = block.timestamp - sellOrder.start;

        if (secondsPassed >= publicSaleDurationSeconds) {
            return finalPrice;
        } else {
            uint256 totalPriceChange = initialPrice.sub(finalPrice);
            uint256 currentPriceChange = totalPriceChange.mul(secondsPassed).div(publicSaleDurationSeconds);
            uint256 currentPrice = initialPrice.sub(currentPriceChange);

            return currentPrice;
        }
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
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v, r, s), nonces[sellOrder.maker]);

        require(validateBuyNow(sellOrder, msg.sender));

        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(
                sellOrder.auctionType,
                sellOrder.takeAssets[i],
                msg.sender,
                sellOrder.maker,
                sellOrder.auctionType == LibSignature.AuctionType.Decreasing ? getDecreasingPrice(sellOrder) : 0
            );
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(sellOrder.auctionType, sellOrder.makeAssets[j], sellOrder.maker, msg.sender, 0);
        }

        emit Match(
            sellHash,
            0x0000000000000000000000000000000000000000000000000000000000000000,
            sellOrder.auctionType,
            Sig(v, r, s),
            Sig(
                0,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0x0000000000000000000000000000000000000000000000000000000000000000
            ),
            sellOrder.taker != address(0x0)
        );

        emit Match2A(
            sellHash,
            sellOrder.maker,
            sellOrder.taker,
            sellOrder.start,
            sellOrder.end,
            sellOrder.nonce,
            sellOrder.salt
        );

        emitMatch2(sellOrder, sellHash, sellOrder, 0x0000000000000000000000000000000000000000000000000000000000000000);
    }

    function emitMatch2(
        LibSignature.Order calldata sellOrder,
        bytes32 sellStructHash,
        LibSignature.Order calldata buyOrder,
        bytes32 buyStructHash
    ) private {
        bytes[] memory sellerMakerOrderAssetData = new bytes[](sellOrder.makeAssets.length);
        bytes[] memory sellerMakerOrderAssetTypeData = new bytes[](sellOrder.makeAssets.length);
        bytes4[] memory sellerMakerOrderAssetClass = new bytes4[](sellOrder.makeAssets.length);
        for (uint256 i = 0; i < sellOrder.makeAssets.length; i++) {
            sellerMakerOrderAssetData[i] = sellOrder.makeAssets[i].data;
            sellerMakerOrderAssetTypeData[i] = sellOrder.makeAssets[i].assetType.data;
            sellerMakerOrderAssetClass[i] = sellOrder.makeAssets[i].assetType.assetClass;
        }

        bytes[] memory sellerTakerOrderAssetData = new bytes[](sellOrder.takeAssets.length);
        bytes[] memory sellerTakerOrderAssetTypeData = new bytes[](sellOrder.takeAssets.length);
        bytes4[] memory sellerTakerOrderAssetClass = new bytes4[](sellOrder.takeAssets.length);
        for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
            sellerTakerOrderAssetData[i] = sellOrder.takeAssets[i].data;
            sellerTakerOrderAssetTypeData[i] = sellOrder.takeAssets[i].assetType.data;
            sellerTakerOrderAssetClass[i] = sellOrder.takeAssets[i].assetType.assetClass;
        }

        emit Match2B(
            sellStructHash,
            sellerMakerOrderAssetData,
            sellerMakerOrderAssetTypeData,
            sellerMakerOrderAssetClass,
            sellerTakerOrderAssetData,
            sellerTakerOrderAssetTypeData,
            sellerTakerOrderAssetClass
        );

        // buy order
        if (buyStructHash != 0x0000000000000000000000000000000000000000000000000000000000000000) {
            emitMatch3(buyStructHash, buyOrder);
        }
    }

    function emitMatch3(bytes32 buyStructHash, LibSignature.Order calldata buyOrder) private {
        bytes[] memory buyerMakerOrderAssetData = new bytes[](buyOrder.makeAssets.length);
        bytes[] memory buyerMakerOrderAssetTypeData = new bytes[](buyOrder.makeAssets.length);
        bytes4[] memory buyerMakerOrderAssetClass = new bytes4[](buyOrder.makeAssets.length);
        for (uint256 i = 0; i < buyOrder.makeAssets.length; i++) {
            buyerMakerOrderAssetData[i] = buyOrder.makeAssets[i].data;
            buyerMakerOrderAssetTypeData[i] = buyOrder.makeAssets[i].assetType.data;
            buyerMakerOrderAssetClass[i] = buyOrder.makeAssets[i].assetType.assetClass;
        }

        bytes[] memory buyerTakerOrderAssetData = new bytes[](buyOrder.takeAssets.length);
        bytes[] memory buyerTakerOrderAssetTypeData = new bytes[](buyOrder.takeAssets.length);
        bytes4[] memory buyerTakerOrderAssetClass = new bytes4[](buyOrder.takeAssets.length);
        for (uint256 i = 0; i < buyOrder.takeAssets.length; i++) {
            buyerTakerOrderAssetData[i] = buyOrder.takeAssets[i].data;
            buyerTakerOrderAssetTypeData[i] = buyOrder.takeAssets[i].assetType.data;
            buyerTakerOrderAssetClass[i] = buyOrder.takeAssets[i].assetType.assetClass;
        }

        emit Match3A(
            buyStructHash,
            buyOrder.maker,
            buyOrder.taker,
            buyOrder.start,
            buyOrder.end,
            buyOrder.nonce,
            buyOrder.salt
        );

        emit Match3B(
            buyStructHash,
            buyerMakerOrderAssetData,
            buyerMakerOrderAssetTypeData,
            buyerMakerOrderAssetClass,
            buyerTakerOrderAssetData,
            buyerTakerOrderAssetTypeData,
            buyerTakerOrderAssetClass
        );
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
        LibSignature.Order calldata sellOrder,
        LibSignature.Order calldata buyOrder,
        uint8[2] calldata v,
        bytes32[2] calldata r,
        bytes32[2] calldata s
    ) public payable nonReentrant {
        // checks
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v[0], r[0], s[0]), nonces[sellOrder.maker]);

        bytes32 buyHash = requireValidOrder(buyOrder, Sig(v[1], r[1], s[1]), nonces[buyOrder.maker]);

        require(validateMatch(sellOrder, buyOrder, false));

        if (sellOrder.end != 0) {
            require(block.timestamp >= sellOrder.end.sub(86400), "NFT.com: execution window has not been met");
        }

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
            transfer(sellOrder.auctionType, buyOrder.makeAssets[i], buyOrder.maker, sellOrder.maker, 0);
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(sellOrder.auctionType, sellOrder.makeAssets[j], sellOrder.maker, buyOrder.maker, 0);
        }

        // refund leftover eth in contract
        (bool success, ) = msg.sender.call{ value: address(this).balance }("");
        require(success);

        emit Match(
            sellHash,
            buyHash,
            sellOrder.auctionType,
            Sig(v[0], r[0], s[0]),
            Sig(v[1], r[1], s[1]),
            sellOrder.taker != address(0x0)
        );

        emit Match2A(
            sellHash,
            sellOrder.maker,
            sellOrder.taker,
            sellOrder.start,
            sellOrder.end,
            sellOrder.nonce,
            sellOrder.salt
        );

        emitMatch2(sellOrder, sellHash, buyOrder, buyHash);
    }
}
