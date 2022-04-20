// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IERC1271.sol";
import "./helpers/TransferExecutor.sol";
import "./ValidationLogic.sol";
import "./MarketplaceEvent.sol";

contract NftMarketplace is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, TransferExecutor {
    using AddressUpgradeable for address;

<<<<<<< HEAD
=======
    uint256 private constant UINT256_MAX = 2**256 - 1;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    bytes4 internal constant MAGICVALUE = 0x1626ba7e; // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized order, by hash
    mapping(bytes32 => uint256) private _approvedOrdersByNonce;
    mapping(address => uint256) public nonces; // nonce for each account
    ValidationLogic public validationLogic;
    MarketplaceEvent public marketplaceEvent;

    //events
    event Cancel(bytes32 structHash, address indexed maker);
    event Approval(bytes32 structHash, address indexed maker);
    event NonceIncremented(address indexed maker, uint256 newNonce);

<<<<<<< HEAD
    enum ROYALTY {
        FUNGIBLE_MAKE_ASSETS,
        FUNGIBLE_TAKE_ASSETS,
        FUNGIBLE_SELLER_MAKE_ASSETS,
        FUNGIBLE_BUYER_MAKE_ASSETS,
        NEITHER
    }

=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    function initialize(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        address _cryptoKittyProxy,
        address _stakingContract,
        address _nftToken,
        ValidationLogic _validationLogic,
        MarketplaceEvent _marketplaceEvent
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
        validationLogic = _validationLogic;
        marketplaceEvent = _marketplaceEvent;
        __Ownable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     * @dev internal functions for returning struct hash, after verifying it is valid
     * @param order the order itself
     * @param sig the struct sig (contains VRS)
<<<<<<< HEAD
     * @return hash of order and nonce
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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

    // invalidate all previous unused nonce orders
    function incrementNonce() external {
        uint256 newNonce = ++nonces[msg.sender];
        emit NonceIncremented(msg.sender, newNonce);
    }

<<<<<<< HEAD
    function orderApproved(bytes32 hash) public view returns (bool approved) {
        return _approvedOrdersByNonce[hash] != 0;
=======
    function orderApproved(
        LibSignature.Order calldata order
    ) public view returns (bool approved) {
        require(order.salt != 0);
        bytes32 hash = LibSignature.getStructHash(order, nonces[order.maker]);

        return _approvedOrdersByNonce[hash] != 0 && !cancelledOrFinalized[hash];
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    /**
     * @dev internal function for validating a buy or sell order
     * @param hash the struct hash for a bid
     * @param order the order itself
     * @param sig the struct sig (contains VRS)
<<<<<<< HEAD
     * @return true if signature matches has of order; also checks for contract signature
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
                IERC1271(order.maker).isValidSignature(hashV4, LibSignature.concatVRS(sig.v, sig.r, sig.s)) ==
                    MAGICVALUE,
                "!1271"
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
<<<<<<< HEAD
     * @return tuple, index 0 = true if order is valid and index 1 = hash of order
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
        require(msg.sender == order.maker);
        require(order.salt != 0);
<<<<<<< HEAD
=======

>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
        require(msg.sender == order.maker);
        require(order.salt != 0);
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
<<<<<<< HEAD
     * @param v vSig (optional if order is already approved)
     * @param r rSig (optional if order is already approved)
     * @param s sSig (optional if order is already approved)
=======
     * @param v vSig
     * @param r rSig
     * @param s sSig
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
     */
    function buyNow(
        LibSignature.Order calldata sellOrder,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        // checks
        bytes32 sellHash = requireValidOrder(sellOrder, Sig(v, r, s), nonces[sellOrder.maker]);
<<<<<<< HEAD
        require(validationLogic.validateBuyNow(sellOrder, msg.sender));
        require(msg.sender != sellOrder.maker, "!maker");

        cancelledOrFinalized[sellHash] = true;

        ROYALTY royaltyScore = (LibAsset.isSingularNft(sellOrder.takeAssets) &&
            LibAsset.isOnlyFungible(sellOrder.makeAssets))
            ? ROYALTY.FUNGIBLE_MAKE_ASSETS
            : (LibAsset.isSingularNft(sellOrder.makeAssets) && LibAsset.isOnlyFungible(sellOrder.takeAssets))
            ? ROYALTY.FUNGIBLE_TAKE_ASSETS
            : ROYALTY.NEITHER;
=======

        require(validationLogic.validateBuyNow(sellOrder, msg.sender));
        require(msg.sender != sellOrder.maker);

        uint256 royaltyScore = (LibAsset.isSingularNft(sellOrder.takeAssets) &&
            LibAsset.isOnlyFungible(sellOrder.makeAssets))
            ? 1
            : (LibAsset.isSingularNft(sellOrder.makeAssets) && LibAsset.isOnlyFungible(sellOrder.takeAssets))
            ? 2
            : 0;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < sellOrder.takeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(
                sellOrder.auctionType,
                sellOrder.takeAssets[i],
                msg.sender,
                sellOrder.maker,
                sellOrder.auctionType == LibSignature.AuctionType.Decreasing
                    ? validationLogic.getDecreasingPrice(sellOrder)
                    : 0,
<<<<<<< HEAD
                royaltyScore == ROYALTY.FUNGIBLE_TAKE_ASSETS,
=======
                royaltyScore == 2,
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
<<<<<<< HEAD
                royaltyScore == ROYALTY.FUNGIBLE_MAKE_ASSETS,
                sellOrder.takeAssets // nft asset for royalty calculation
=======
                royaltyScore == 1,
                sellOrder.takeAssets
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
            );
        }

        require(marketplaceEvent.emitBuyNow(sellHash, sellOrder, v, r, s));
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
<<<<<<< HEAD
        require(msg.sender == sellOrder.maker || msg.sender == buyOrder.maker, "!maker");
        require(validationLogic.validateMatch_(sellOrder, buyOrder, msg.sender, false));

        if (sellOrder.end != 0) {
            require(block.timestamp >= (sellOrder.end - 24 hours), "!exe");
        }

        // effects
        cancelledOrFinalized[buyHash] = true;
        cancelledOrFinalized[sellHash] = true;

        ROYALTY royaltyScore = (LibAsset.isSingularNft(buyOrder.makeAssets) &&
            LibAsset.isOnlyFungible(sellOrder.makeAssets))
            ? ROYALTY.FUNGIBLE_SELLER_MAKE_ASSETS
            : (LibAsset.isSingularNft(sellOrder.makeAssets) && LibAsset.isOnlyFungible(buyOrder.makeAssets))
            ? ROYALTY.FUNGIBLE_BUYER_MAKE_ASSETS
            : ROYALTY.NEITHER;
=======
        require(validationLogic.validateMatch_(sellOrder, buyOrder));

        // make sure execution window begins 24 hours before end of sellOrder
        if (sellOrder.end != 0) {
            require(block.timestamp >= (sellOrder.end - 86400), "!exe");
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
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

        // interactions (i.e. perform swap, fees and royalties)
        for (uint256 i = 0; i < buyOrder.makeAssets.length; i++) {
            // send assets from buyer to seller (payment for goods)
            transfer(
                sellOrder.auctionType,
                buyOrder.makeAssets[i],
                buyOrder.maker,
                sellOrder.maker,
                0,
<<<<<<< HEAD
                royaltyScore == ROYALTY.FUNGIBLE_BUYER_MAKE_ASSETS,
                sellOrder.makeAssets // nft asset for royalty calculation
=======
                royaltyScore == 2,
                sellOrder.makeAssets
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
<<<<<<< HEAD
                royaltyScore == ROYALTY.FUNGIBLE_SELLER_MAKE_ASSETS,
                buyOrder.makeAssets // nft asset for royalty calculation
=======
                royaltyScore == 1,
                buyOrder.makeAssets
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
            );
        }

        // refund leftover eth in contract
        (bool success, ) = msg.sender.call{ value: address(this).balance }("");
        require(success);

        require(marketplaceEvent.emitExecuteSwap(sellHash, buyHash, sellOrder, buyOrder, v, r, s));
    }
}
