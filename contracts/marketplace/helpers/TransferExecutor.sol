// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../interfaces/IERC20TransferProxy.sol";
import "../interfaces/INftTransferProxy.sol";
import "../interfaces/ITransferProxy.sol";
import "../interfaces/ITransferExecutor.sol";

abstract contract TransferExecutor is Initializable, OwnableUpgradeable, ITransferExecutor {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // bitpacked storage
    struct RoyaltyInfo {
        address owner;
        uint96 percent; // 0 - 10000, where 10000 is 100%, 100 = 1%
    }

    address public nftBuyContract; // uint160
    uint256 public protocolFee; // value 0 - 2000, where 2000 = 20% fees, 100 = 1%

    mapping(bytes4 => address) public proxies;
    mapping(address => bool) public whitelistERC20; // whitelist of supported ERC20s
    mapping(address => RoyaltyInfo) public royaltyInfo; // mapping of NFT to their royalties

    address public nftToken;
    uint64 public constant MAX_ROYALTY = 10000; // 10000 = 100%
    uint64 public constant MAX_PROTOCOL_FEE = 2000; // 2000 = 20%

    event ProxyChange(bytes4 indexed assetType, address proxy);
    event WhitelistChange(address indexed token, bool value);
    event ProtocolFeeChange(uint256 fee);
    event RoyaltyInfoChange(address indexed token, address indexed owner, uint256 percent);

    function __TransferExecutor_init_unchained(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        address _cryptoKittyProxy,
        address _nftBuyContract,
        address _nftToken,
        uint256 _protocolFee
    ) internal {
        proxies[LibAsset.ERC20_ASSET_CLASS] = address(_erc20TransferProxy);
        proxies[LibAsset.ERC721_ASSET_CLASS] = address(_transferProxy);
        proxies[LibAsset.ERC1155_ASSET_CLASS] = address(_transferProxy);
        proxies[LibAsset.CRYPTO_KITTY] = _cryptoKittyProxy;
        nftBuyContract = _nftBuyContract;
        protocolFee = _protocolFee;
        nftToken = _nftToken;
    }

    function setRoyalty(
        address nftContract,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(amount <= MAX_ROYALTY);
        royaltyInfo[nftContract].owner = recipient;
        royaltyInfo[nftContract].percent = uint96(amount);

        emit RoyaltyInfoChange(nftContract, recipient, amount);
    }

    function changeProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_PROTOCOL_FEE);
        protocolFee = _fee;
        emit ProtocolFeeChange(_fee);
    }

    function modifyWhitelist(address _token, bool _val) external onlyOwner {
        require(whitelistERC20[_token] != _val);
        whitelistERC20[_token] = _val;
        emit WhitelistChange(_token, _val);
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
     * @param validRoyalty true if singular NFT asset paired with only fungible token(s) trade
     * @param optionalNftAssets only used if validRoyalty is true, should be 1 asset => NFT collection being traded
     */
    function transferEth(
        address to,
        uint256 value,
        bool validRoyalty,
        LibAsset.Asset[] memory optionalNftAssets
    ) internal {
        uint256 royalty;

        // handle royalty
        if (validRoyalty) {
            require(optionalNftAssets.length == 1, "NFT.com: Royalty not supported for multiple NFTs");
            require(optionalNftAssets[0].assetType.assetClass == LibAsset.ERC721_ASSET_CLASS, "te !721");
            (address nftRoyalty, , ) = abi.decode(optionalNftAssets[0].assetType.data, (address, uint256, bool));

            // handle royalty
            if (royaltyInfo[nftRoyalty].owner != address(0) && royaltyInfo[nftRoyalty].percent != uint256(0)) {
                // Royalty
                royalty = (value * royaltyInfo[nftRoyalty].percent) / 10000;

                (bool success3, ) = royaltyInfo[nftRoyalty].owner.call{ value: royalty }("");
                require(success3, "te !rty");
            }
        }

        // ETH Fee
        uint256 fee = ((value - royalty) * protocolFee) / 10000;
        (bool success1, ) = nftBuyContract.call{ value: fee }("");
        (bool success2, ) = to.call{ value: (value - royalty) - fee }("");

        require(success1 && success2, "te !eth");
    }

    /**
     * @dev multi-asset transfer function
     * @param auctionType type of auction
     * @param asset the asset being transferred
     * @param from address where asset is being sent from
     * @param to address receiving said asset
     * @param decreasingPriceValue value only used for decreasing price auction
     * @param validRoyalty true if singular NFT asset paired with only fungible token(s) trade
     * @param optionalNftAssets only used if validRoyalty is true, should be 1 asset => NFT collection being traded
     */
    function transfer(
        LibSignature.AuctionType auctionType,
        LibAsset.Asset memory asset,
        address from,
        address to,
        uint256 decreasingPriceValue,
        bool validRoyalty,
        LibAsset.Asset[] memory optionalNftAssets
    ) internal override {
        require(nftBuyContract != address(0));
        require(to != address(0) && from != address(0));
        uint256 value;

        if (auctionType == LibSignature.AuctionType.Decreasing && from == msg.sender) value = decreasingPriceValue;
        else (value, ) = abi.decode(asset.data, (uint256, uint256));

        require(value != 0);

        if (asset.assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
            transferEth(to, value, validRoyalty, optionalNftAssets);
        } else if (asset.assetType.assetClass == LibAsset.ERC20_ASSET_CLASS) {
            address token = abi.decode(asset.assetType.data, (address));
            require(whitelistERC20[token], "t !list");
            uint256 royalty;

            // handle royalty
            if (validRoyalty) {
                require(optionalNftAssets.length == 1, "t len");
                require(optionalNftAssets[0].assetType.assetClass == LibAsset.ERC721_ASSET_CLASS, "t !721");
                (address nftContract, , ) = abi.decode(optionalNftAssets[0].assetType.data, (address, uint256, bool));

                if (royaltyInfo[nftContract].owner != address(0) && royaltyInfo[nftContract].percent != uint256(0)) {
                    royalty = (value * royaltyInfo[nftContract].percent) / 10000;

                    // Royalty
                    IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                        IERC20Upgradeable(token),
                        from,
                        royaltyInfo[nftContract].owner,
                        royalty
                    );
                }
            }

            uint256 feePercent = token == nftToken ? protocolFee / 2 : protocolFee;
            uint256 fee = ((value - royalty) * feePercent) / 10000;

            // ERC20 Fee
            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                nftBuyContract,
                fee
            );

            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                to,
                (value - royalty) - fee
            );
        } else if (asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS) {
            (address token, uint256 tokenId, ) = abi.decode(asset.assetType.data, (address, uint256, bool));

            require(value == 1, "t !1");
            INftTransferProxy(proxies[LibAsset.ERC721_ASSET_CLASS]).erc721safeTransferFrom(
                IERC721Upgradeable(token),
                from,
                to,
                tokenId
            );
        } else if (asset.assetType.assetClass == LibAsset.ERC1155_ASSET_CLASS) {
            (address token, uint256 tokenId, ) = abi.decode(asset.assetType.data, (address, uint256, bool));
            INftTransferProxy(proxies[LibAsset.ERC1155_ASSET_CLASS]).erc1155safeTransferFrom(
                IERC1155Upgradeable(token),
                from,
                to,
                tokenId,
                value,
                ""
            );
        } else {
            // non standard assets
            ITransferProxy(proxies[asset.assetType.assetClass]).transfer(asset, from, to);
        }
        emit Transfer(asset, from, to);
    }

    uint256[49] private __gap;
}
