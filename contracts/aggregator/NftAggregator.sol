// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "./SpecialTransferHelper.sol";
import "./MarketplaceRegistry.sol";

error InactiveMarket();
error MAX_FEE_EXCEEDED();
error TradingNotOpen();

interface INftProfile {
    function ownerOf(uint256 _tokenId) external view returns (address);
}

contract NftAggregator is Initializable, ReentrancyGuardUpgradeable, UUPSUpgradeable, SpecialTransferHelper {
    struct ERC20Details {
        address[] tokenAddrs;
        uint256[] amounts;
    }

    struct ERC1155Details {
        address tokenAddr;
        uint256[] ids;
        uint256[] amounts;
    }

    struct Approvals {
        IERC20Upgradeable token;
        address operator;
        uint256 amount;
    }

    address public owner;
    MarketplaceRegistry public marketplaceRegistry;
    uint64 public percentFeeToDao; // 0 - 10000, where 10000 = 100% of fees
    uint64 public baseFee; // 0 - 10000, where 10000 = 100% of fees
    uint128 public extra; // extra for now
    bool public openForTrades;
    bool public openForFreeTrades;
    address public converter;
    address public nftProfile;

    event NewConverter(address indexed _new);
    event NewNftProfile(address indexed _new);
    event NewOwner(address indexed _new);

    function _onlyOwner() private view {
        require(msg.sender == owner);
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function initialize(address _marketRegistry) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __SpecialTransfer_init();

        owner = msg.sender;
        marketplaceRegistry = MarketplaceRegistry(_marketRegistry);
        percentFeeToDao = 0;
        baseFee = 0;
        openForTrades = true;
        openForFreeTrades = true;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function _checkCallResult(bool _success) internal pure {
        if (!_success) {
            assembly {
                // revert reason from call
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external virtual returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return 0x150b7a02;
    }

    // Used by ERC721BasicToken.sol
    function onERC721Received(
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return 0xf0b9e5ba;
    }

    function supportsInterface(bytes4 interfaceId) external view virtual returns (bool) {
        return interfaceId == this.supportsInterface.selector;
    }

    receive() external payable {}

    function _transferEth(address _to, uint256 _amount) internal {
        bool callStatus;
        assembly {
            // Transfer the ETH and store if it succeeded or not.
            callStatus := call(gas(), _to, _amount, 0, 0, 0, 0)
        }
        require(callStatus, "_transferEth: Eth transfer failed");
    }

    // GOV functions
    function setOwner(address _new) external onlyOwner {
        owner = _new;
        emit NewOwner(_new);
    }

    function setConvertor(address _new) external onlyOwner {
        converter = _new;
        emit NewConverter(_new);
    }

    function setNftProfile(address _new) external onlyOwner {
        nftProfile = _new;
        emit NewNftProfile(_new);
    }

    function setDaoFees(uint64 _percentFeeToDao) external onlyOwner {
        if (_percentFeeToDao > 10000) revert MAX_FEE_EXCEEDED();
        percentFeeToDao = _percentFeeToDao;
    }

    function setBaseFees(uint64 _baseFee) external onlyOwner {
        if (_baseFee > 10000) revert MAX_FEE_EXCEEDED();
        baseFee = _baseFee;
    }

    function setOpenForTrades(bool _openForTrades) external onlyOwner {
        openForTrades = _openForTrades;
    }

    function setOpenForFreeTrades(bool _openForFreeTrades) external onlyOwner {
        openForFreeTrades = _openForFreeTrades;
    }

    // Emergency function: In case any ETH get stuck in the contract unintentionally
    // Only owner can retrieve the asset balance to a recipient address
    function rescueETH(address recipient) external onlyOwner {
        _transferEth(recipient, address(this).balance);
    }

    // Emergency function: In case any ERC20 tokens get stuck in the contract unintentionally
    // Only owner can retrieve the asset balance to a recipient address
    function rescueERC20(address asset, address recipient) external onlyOwner {
        asset.call(abi.encodeWithSelector(0xa9059cbb, recipient, IERC20Upgradeable(asset).balanceOf(address(this))));
    }

    // Emergency function: In case any ERC721 tokens get stuck in the contract unintentionally
    // Only owner can retrieve the asset balance to a recipient address
    function rescueERC721(
        address asset,
        uint256[] calldata ids,
        address recipient
    ) external onlyOwner {
        for (uint256 i = 0; i < ids.length; i++) {
            IERC721Upgradeable(asset).transferFrom(address(this), recipient, ids[i]);
        }
    }

    // Emergency function: In case any ERC1155 tokens get stuck in the contract unintentionally
    // Only owner can retrieve the asset balance to a recipient address
    function rescueERC1155(
        address asset,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        address recipient
    ) external onlyOwner {
        for (uint256 i = 0; i < ids.length; i++) {
            IERC1155Upgradeable(asset).safeTransferFrom(address(this), recipient, ids[i], amounts[i], "");
        }
    }

    function _transferFromHelper(
        ERC20Details memory erc20Details,
        SpecialTransferHelper.ERC721Details[] memory erc721Details,
        ERC1155Details[] memory erc1155Details
    ) internal {
        // transfer ERC20 tokens from the sender to this contract
        for (uint256 i = 0; i < erc20Details.tokenAddrs.length; i++) {
            erc20Details.tokenAddrs[i].call(
                abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), erc20Details.amounts[i])
            );
        }

        // transfer ERC721 tokens from the sender to this contract
        for (uint256 i = 0; i < erc721Details.length; i++) {
            // accept CryptoPunks
            if (erc721Details[i].tokenAddr == 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB) {
                _acceptCryptoPunk(erc721Details[i]);
            }
            // accept Mooncat
            else if (erc721Details[i].tokenAddr == 0x60cd862c9C687A9dE49aecdC3A99b74A4fc54aB6) {
                _acceptMoonCat(erc721Details[i]);
            }
            // default
            else {
                for (uint256 j = 0; j < erc721Details[i].ids.length; j++) {
                    IERC721Upgradeable(erc721Details[i].tokenAddr).transferFrom(
                        _msgSender(),
                        address(this),
                        erc721Details[i].ids[j]
                    );
                }
            }
        }

        // transfer ERC1155 tokens from the sender to this contract
        for (uint256 i = 0; i < erc1155Details.length; i++) {
            IERC1155Upgradeable(erc1155Details[i].tokenAddr).safeBatchTransferFrom(
                _msgSender(),
                address(this),
                erc1155Details[i].ids,
                erc1155Details[i].amounts,
                ""
            );
        }
    }

    // one time approval for tokens
    function setOneTimeApproval(
        Approvals[] calldata _approvals
    ) external onlyOwner {
        for (uint256 i = 0; i < _approvals.length;) {
            _approvals[i].token.approve(
                _approvals[i].operator,
                _approvals[i].amount
            );
            unchecked {
                ++i;
            }
        }
    }

    // helper function for collecting fee
    function _collectFee(
        uint256 _profileTokenId,
        uint256 _wei
    ) internal {
        if (percentFeeToDao != 0) {
            _transferEth(INftProfile(nftProfile).ownerOf(_profileTokenId), _wei * percentFeeToDao / 10000);
        }

        _transferEth(INftProfile(nftProfile).ownerOf(_profileTokenId), _wei * (10000 -  percentFeeToDao) / 10000);
    }

    // helper function for trading
    function _trade(
        MarketplaceRegistry.TradeDetails[] memory _tradeDetails
    ) internal {
        for (uint256 i = 0; i < _tradeDetails.length; ) {
            (address _proxy, bool _isLib, bool _isActive) = marketplaceRegistry.marketplaces(_tradeDetails[i].marketId);
            if (!_isActive) revert InactiveMarket();

            (bool success, ) = _isLib
                ? _proxy.delegatecall(_tradeDetails[i].tradeData)
                : _proxy.call{ value: _tradeDetails[i].value }(_tradeDetails[i].tradeData);

            _checkCallResult(success);

            unchecked {
                ++i;
            }
        }
    }

    function batchTradeWithETH(
        MarketplaceRegistry.TradeDetails[] calldata _tradeDetails,
        address[] calldata dustTokens,
        uint256[2] calldata feeDetails    // [affiliateTokenId, ETH fee in Wei]
    )
        external
        payable
        nonReentrant
    {
        _collectFee(feeDetails[0], feeDetails[1]);

        _trade(_tradeDetails);

        _returnDust(dustTokens);
    }

    function _conversionHelper(
        bytes[] memory _conversionDetails
    ) internal {
        for (uint256 i = 0; i < _conversionDetails.length; i++) {
            (bool success, ) = converter.delegatecall(_conversionDetails[i]);
            _checkCallResult(success);
        }
    }

    function batchTrade(
        ERC20Details calldata erc20Details,
        bytes[] calldata _conversionDetails,
        MarketplaceRegistry.TradeDetails[] calldata _tradeDetails,
        address[] calldata dustTokens,
        uint256[2] calldata feeDetails    // [affiliateTokenId, ETH fee in Wei]
    ) external payable nonReentrant {
        for (uint256 i = 0; i < erc20Details.tokenAddrs.length; ) {
            erc20Details.tokenAddrs[i].call(
                abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), erc20Details.amounts[i])
            );

            unchecked {
                ++i;
            }
        }

        _collectFee(feeDetails[0], feeDetails[1]);

        _conversionHelper(_conversionDetails);

        _trade(_tradeDetails);

        _returnDust(dustTokens);
    }

    function multiAssetSwap(
        ERC20Details calldata erc20Details,
        SpecialTransferHelper.ERC721Details[] calldata erc721Details,
        ERC1155Details[] calldata erc1155Details,
        bytes[] calldata converstionDetails,
        MarketplaceRegistry.TradeDetails[] calldata tradeDetails,
        address[] calldata dustTokens,
        uint256[2] calldata feeDetails    // [affiliateTokenId, ETH fee in Wei]
    ) payable external nonReentrant {
        if (!openForTrades) revert TradingNotOpen();
        
        _collectFee(feeDetails[0], feeDetails[1]);

        // transfer all tokens
        _transferFromHelper(
            erc20Details,
            erc721Details,
            erc1155Details
        );

        // Convert any assets if needed
        _conversionHelper(converstionDetails);

        // execute trades
        _trade(tradeDetails);

        // return dust tokens (if any)
        _returnDust(dustTokens);
    }

    function _returnDust(
        address[] memory _tokens
    ) internal {
        // return remaining ETH (if any)
        assembly {
            if gt(selfbalance(), 0) {
                let callStatus := call(gas(), caller(), selfbalance(), 0, 0, 0, 0)
            }
        }
        // return remaining tokens (if any)
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (IERC20Upgradeable(_tokens[i]).balanceOf(address(this)) > 0) {
                _tokens[i].call(
                    abi.encodeWithSelector(
                        0xa9059cbb,
                        msg.sender,
                        IERC20Upgradeable(_tokens[i]).balanceOf(address(this))
                    )
                );
            }
        }
    }
}
