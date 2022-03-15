// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IValidationLogic.sol";

abstract contract ValidationLogic is Initializable, OwnableUpgradeable, IValidationLogic {
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
        }
        // no need to handle LibAsset.ETH_ASSET_CLASS since that is handled at run time
        else {
            // should not come here
            return false;
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
            // buyOrder must be within bounds
            buyMakeValue >= sellTakeMinValue &&
            // make sure tokenIds match if NFT AND contract address matches
            validAssetTypeData(
                sellTakeAsset.assetType.assetClass,
                buyMakeAsset.assetType.data,
                sellTakeAsset.assetType.data
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
                if (!validateSingleAssetMatch2(sellOrder.takeAssets[i], buyOrder.makeAssets[i])) {
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
     * @dev validateBuyNow makes sure a buyer can fulfill the sellOrder and that the sellOrder is formatted properly
     * @param sellOrder the listing
     * @param buyer potential executor of sellOrder
     */
    function validateBuyNow(LibSignature.Order calldata sellOrder, address buyer) public view override returns (bool) {
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
     * @dev public facing function to make sure orders can execute
     * @param sellOrder the listing
     * @param buyOrder bid for a listing
     */
    function validateMatch_(LibSignature.Order calldata sellOrder, LibSignature.Order calldata buyOrder)
        public
        view
        override
        returns (bool)
    {
        return validateMatch(sellOrder, buyOrder, true);
    }

    function getDecreasingPrice(LibSignature.Order memory sellOrder) public view override returns (uint256) {
        require(sellOrder.auctionType == LibSignature.AuctionType.Decreasing, "NFT.com: auction type must match");
        require(sellOrder.takeAssets.length == 1, "NFT.com: sellOrder must have 1 takeAsset");
        require(
            (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ETH_ASSET_CLASS) ||
                (sellOrder.takeAssets[0].assetType.assetClass == LibAsset.ERC20_ASSET_CLASS),
            "NFT.com: decreasing auction only supports ETH and ERC20"
        );

        uint256 secondsPassed = 0;
        uint256 publicSaleDurationSeconds = sellOrder.end - sellOrder.start;
        uint256 finalPrice;
        uint256 initialPrice;

        (initialPrice, finalPrice) = abi.decode(sellOrder.takeAssets[0].data, (uint256, uint256));

        secondsPassed = block.timestamp - sellOrder.start;

        if (secondsPassed >= publicSaleDurationSeconds) {
            return finalPrice;
        } else {
            uint256 totalPriceChange = initialPrice - finalPrice;
            uint256 currentPriceChange = (totalPriceChange * secondsPassed) / publicSaleDurationSeconds;
            return initialPrice - currentPriceChange;
        }
    }
}
