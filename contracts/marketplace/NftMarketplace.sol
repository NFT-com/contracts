// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IERC1271.sol";
import "./helpers/TransferExecutor.sol";
import "./ValidationLogic.sol";

contract NftMarketplace is
    Initializable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    TransferExecutor,
    ValidationLogic
{
    using AddressUpgradeable for address;

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 private constant UINT256_MAX = 2**256 - 1;
    bytes4 internal constant MAGICVALUE = 0x1626ba7e; // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized order, by hash
    mapping(bytes32 => uint256) private _approvedOrdersByNonce;
    mapping(address => uint256) public nonces; // nonce for each account

    //events
    event Cancel(bytes32 structHash, address indexed maker);
    event Approval(bytes32 structHash, address indexed maker);
    event NonceIncremented(address indexed maker, uint256 newNonce);
    event BuyNowInfo(bytes32 indexed makerStructHash, address takerAddress);
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
        address _stakingContract,
        address _nftToken
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __TransferExecutor_init_unchained(
            _transferProxy,
            _erc20TransferProxy,
            _cryptoKittyProxy,
            _stakingContract,
            _nftToken,
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

        uint256 royaltyScore = (LibAsset.isSingularNft(sellOrder.takeAssets) &&
            LibAsset.isOnlyFungible(sellOrder.makeAssets))
            ? 1
            : (LibAsset.isSingularNft(sellOrder.makeAssets) && LibAsset.isOnlyFungible(sellOrder.takeAssets))
            ? 2
            : 0;

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(
                sellOrder.auctionType,
                sellOrder.takeAssets[i],
                msg.sender,
                sellOrder.maker,
                sellOrder.auctionType == LibSignature.AuctionType.Decreasing ? getDecreasingPrice(sellOrder) : 0,
                royaltyScore == 2,
                sellOrder.makeAssets
            );
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(
                sellOrder.auctionType,
                sellOrder.makeAssets[j],
                sellOrder.maker,
                msg.sender,
                0,
                royaltyScore == 1,
                sellOrder.takeAssets
            );
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

        emit BuyNowInfo(sellHash, msg.sender);

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

        require(validateMatch_(sellOrder, buyOrder));

        if (sellOrder.end != 0) {
            require(block.timestamp >= (sellOrder.end - 86400), "NFT.com: execution window has not been met");
        }

        // effects
        if (msg.sender != buyOrder.maker) {
            cancelledOrFinalized[buyHash] = true;
        }
        if (msg.sender != sellOrder.maker) {
            cancelledOrFinalized[sellHash] = true;
        }

        uint256 royaltyScore = (LibAsset.isSingularNft(buyOrder.makeAssets) &&
            LibAsset.isOnlyFungible(sellOrder.makeAssets))
            ? 1
            : (LibAsset.isSingularNft(sellOrder.makeAssets) && LibAsset.isOnlyFungible(buyOrder.makeAssets))
            ? 2
            : 0;

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < buyOrder.makeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(
                sellOrder.auctionType,
                buyOrder.makeAssets[i],
                buyOrder.maker,
                sellOrder.maker,
                0,
                royaltyScore == 2,
                sellOrder.makeAssets
            );
        }

        for (uint256 j = 0; j < sellOrder.makeAssets.length; j++) {
            // send assets from seller to buyer (goods)
            transfer(
                sellOrder.auctionType,
                sellOrder.makeAssets[j],
                sellOrder.maker,
                buyOrder.maker,
                0,
                royaltyScore == 1,
                buyOrder.makeAssets
            );
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
