// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface IUniswapRouter is ISwapRouter {
    function refundETH() external payable;
}

interface IGenesisKey {
    function ownerOf(uint256 tokenId) external view returns (address);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

contract GenesisNftStake is ERC20Permit, ReentrancyGuard {
    using SafeMath for uint256;

    address public nftToken;
    address public nftKeyGenesis;
    mapping(address => bool) public whitelistERC20; // allowed ERC20s
    mapping(uint256 => address) public stakedKeys; // maps tokenId => address
    mapping(address => uint256) public stakedAddress; // maps address => number of keys staked

    IUniswapRouter public constant uniswapRouter = IUniswapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // mainnet: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    // rinkeby: 0xc778417E063141139Fce010982780140Aa0cD5Ab
    address public WETH9;
    address public DAO;

    event WhiteListChange(address indexed token, bool val);
    event NewDao(address indexed dao);

    modifier onlyDAO() {
        require(msg.sender == DAO, "!DAO");
        _;
    }

    constructor(
        address _nftToken,
        address _weth,
        address _nftKeyGenesis
    ) ERC20Permit("Staked NFT.com Genesis Key") ERC20("Staked NFT.com Genesis Key", "xNFTKEY") {
        nftToken = _nftToken;
        WETH9 = _weth;
        nftKeyGenesis = _nftKeyGenesis;
        DAO = msg.sender;
    }

    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function changeDAO(address newDAO) external onlyDAO {
        DAO = newDAO;
        emit NewDao(newDAO);
    }

    // important to restrict random addresses for key input functions into the staking contract
    function modifyWhitelist(address token, bool val) external onlyDAO {
        whitelistERC20[token] = val;
        emit WhiteListChange(token, val);
    }

    function approveToken(address token) external {
        require(whitelistERC20[token], "NFT.com: !ERC20");
        IERC20(token).approve(address(uniswapRouter), 2**256 - 1);
    }

    function convertEthToNFT() external nonReentrant {
        require(!isContract(msg.sender), "NFT.com: !CONTRACT");

        uint256 deadline = block.timestamp + 7;
        address tokenIn = WETH9;
        address tokenOut = nftToken;
        uint24 fee = 3000;
        address recipient = address(this);
        uint256 amountIn = address(this).balance;
        uint256 amountOutMinimum = 1;
        uint160 sqrtPriceLimitX96 = 0;

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            tokenIn,
            tokenOut,
            fee,
            recipient,
            deadline,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96
        );

        uniswapRouter.exactInputSingle{ value: address(this).balance }(params);
        uniswapRouter.refundETH();
    }

    function convertERC20ToNFT(address tokenIn) external nonReentrant {
        require(!isContract(msg.sender), "NFT.com: !CONTRACT");
        require(whitelistERC20[tokenIn], "NFT.com: !ERC20");

        uint256 deadline = block.timestamp + 7;
        address tokenOut = nftToken;
        uint24 fee = 3000;
        address recipient = address(this);
        uint256 amountIn = IERC20(tokenIn).balanceOf(address(this));
        uint256 amountOutMinimum = 1;
        uint160 sqrtPriceLimitX96 = 0;

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            tokenIn,
            tokenOut,
            fee,
            recipient,
            deadline,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96
        );

        uniswapRouter.exactInputSingle(params);
    }

    // important to receive ETH
    receive() external payable {}

    /**
     @notice internal helper function to call allowance for a token
     @param _owner user allowing permit
     @param spender contract allowed to spent balance
     @param v vSig
     @param r rSig
     @param s sSig
    */
    function permitXNFT(
        address _owner,
        address spender,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private {
        return IERC20Permit(nftToken).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
    }

    /**
     @notice function for allowing a user to stake
     @param _amount amount of NFT tokens to stake
     @param v optional vSig param for permit
     @param r optional rSig param for permit
     @param s optional sSig param for permit
    */
    function enter(
        uint256 _amount,
        uint256 _tokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public nonReentrant {
        // checks

        // no stake yet
        if (stakedKeys[_tokenId] != msg.sender) {
            require(IGenesisKey(nftKeyGenesis).ownerOf(_tokenId) == msg.sender, "!GEN_KEY");

            IGenesisKey(nftKeyGenesis).transferFrom(msg.sender, address(this), _tokenId);

            // assigned key to msg.sender
            stakedKeys[_tokenId] = msg.sender;
            stakedAddress[msg.sender] = stakedAddress[msg.sender].add(1);
        }

        // effects
        // only apply approve permit for first time
        if (IERC20(address(this)).allowance(msg.sender, address(this)) < _amount) {
            permitXNFT(msg.sender, address(this), v, r, s); // approve xNFT token
        }

        IERC20(nftToken).transferFrom(msg.sender, address(this), _amount);

        uint256 totalNftTokenLocked = IERC20(nftToken).balanceOf(address(this));
        uint256 totalSupply = totalSupply();

        if (totalSupply == 0 || totalNftTokenLocked == 0) {
            _mint(msg.sender, _amount);
        } else {
            uint256 xNftTokenAmount = _amount.mul(totalSupply).div(totalNftTokenLocked);
            _mint(msg.sender, xNftTokenAmount);
        }
    }

    // simply collects NFT tokens without withdrawing Gen Key
    function collectTokens(uint256 _xNftAmount, uint256 _tokenId) public nonReentrant {
        require(stakedKeys[_tokenId] == msg.sender, "!GEN_KEY");
        uint256 totalSupply = totalSupply();

        uint256 nftAmount = _xNftAmount.mul(IERC20(nftToken).balanceOf(address(this))).div(totalSupply);
        _burn(msg.sender, _xNftAmount);
        IERC20(nftToken).transfer(msg.sender, nftAmount);
    }

    function leave(uint256 _xNftAmount, uint256 _tokenId) public nonReentrant {
        require(stakedKeys[_tokenId] == msg.sender, "!GEN_KEY");
        require(stakedAddress[msg.sender] != 0, "GEN_KEY != 0");

        // reset assignment
        stakedKeys[_tokenId] = address(0x0);
        stakedAddress[msg.sender] = stakedAddress[msg.sender].sub(1);

        uint256 totalSupply = totalSupply();
        uint256 nftAmount = _xNftAmount.mul(IERC20(nftToken).balanceOf(address(this))).div(totalSupply);
        _burn(msg.sender, _xNftAmount);
        IERC20(nftToken).transfer(msg.sender, nftAmount);
        IGenesisKey(nftKeyGenesis).transferFrom(address(this), msg.sender, _tokenId);
    }
}
