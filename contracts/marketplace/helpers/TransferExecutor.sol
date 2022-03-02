// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../interfaces/IERC20TransferProxy.sol";
import "../interfaces/INftTransferProxy.sol";
import "../interfaces/ITransferProxy.sol";
import "../interfaces/ITransferExecutor.sol";

abstract contract TransferExecutor is Initializable, OwnableUpgradeable, ITransferExecutor {
    using SafeMathUpgradeable for uint256;

    address public stakingContract;
    uint256 public protocolFee; // value 0 - 2000, where 2000 = 20% fees, 100 = 1%
    mapping(bytes4 => address) public proxies;
    mapping(address => bool) public whitelistERC20; // whitelist of supported ERC20s (to ensure easy of fee calculation)

    event ProxyChange(bytes4 indexed assetType, address proxy);
    event WhitelistChange(address token, bool value);
    event ProtocolFeeChange(uint256 fee);

    function __TransferExecutor_init_unchained(
        INftTransferProxy _transferProxy,
        IERC20TransferProxy _erc20TransferProxy,
        address _cryptoKittyProxy,
        address _stakingContract,
        uint256 _protocolFee
    ) internal {
        proxies[LibAsset.ERC20_ASSET_CLASS] = address(_erc20TransferProxy);
        proxies[LibAsset.ERC721_ASSET_CLASS] = address(_transferProxy);
        proxies[LibAsset.ERC1155_ASSET_CLASS] = address(_transferProxy);
        proxies[LibAsset.CRYPTO_KITTY] = _cryptoKittyProxy;
        stakingContract = address(_stakingContract);
        protocolFee = _protocolFee;
    }

    function changeProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= 2000, "NFT.com: 20% MAX");
        protocolFee = _fee;
        emit ProtocolFeeChange(_fee);
    }

    function modifyWhitelist(address _token, bool _val) external onlyOwner {
        require(whitelistERC20[_token] != _val, "NFT.com: !SAME");
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
     */
    function transferEth(address to, uint256 value) internal {
        // ETH Fee
        (bool success1, ) = stakingContract.call{ value: value.mul(protocolFee).div(10000) }("");
        (bool success2, ) = to.call{ value: value }("");

        require(success1 && success2, "NFT.com: transfer failed");
    }

    /**
     * @dev multi-asset transfer function
     * @param asset the asset being transferred
     * @param from address where asset is being sent from
     * @param auctionType type of auction
     * @param to address receiving said asset
     * @param decreasingPriceValue value only used for decreasing price auction
     */
    function transfer(
        LibSignature.AuctionType auctionType,
        LibAsset.Asset memory asset,
        address from,
        address to,
        uint256 decreasingPriceValue
    ) internal override {
        require(stakingContract != address(0), "NFT.com: UNINITIALIZED");
        uint256 value;

        if (auctionType == LibSignature.AuctionType.Decreasing && from == msg.sender) value = decreasingPriceValue;
        else (value, ) = abi.decode(asset.data, (uint256, uint256));

        if (asset.assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
            transferEth(to, value);
        } else if (asset.assetType.assetClass == LibAsset.ERC20_ASSET_CLASS) {
            address token = abi.decode(asset.assetType.data, (address));
            require(whitelistERC20[token], "NFT.com: ERC20 NOT SUPPORTED");

            // ERC20 Fee
            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                stakingContract,
                value.mul(protocolFee).div(10000)
            );

            IERC20TransferProxy(proxies[LibAsset.ERC20_ASSET_CLASS]).erc20safeTransferFrom(
                IERC20Upgradeable(token),
                from,
                to,
                value
            );
        } else if (asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS) {
            (address token, uint256 tokenId, ) = abi.decode(asset.assetType.data, (address, uint256, bool));

            require(value == 1, "erc721 value error");
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
}
