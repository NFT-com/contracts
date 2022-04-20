// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../erc721a/ERC721AUpgradeable.sol";
import "../interface/IGenesisKey.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

error PausedTransfer();

interface IGkTeamClaim {
    function addTokenId(uint256 newTokenId) external;
}

contract GenesisKey is Initializable, ERC721AUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, IGenesisKey {
    using SafeMathUpgradeable for uint256;
    using ECDSAUpgradeable for bytes32;

    address public wethAddress;
    address public owner;
    address public multiSig;
    address public genesisKeyMerkle;
    bool public startPublicSale; // global state indicator if public sale is happening
    uint256 public publicSaleStartSecond; // second public sale starts
    uint256 public publicSaleDurationSeconds; // length of public sale in seconds
    uint256 public initialWethPrice; // initial price of genesis keys in Weth
    uint256 public finalWethPrice; // final price of genesis keys in Weth

    mapping(bytes32 => bool) public cancelledOrFinalized; // used hash
    uint256 public remainingTeamAdvisorGrant; // Genesis Keys reserved for team / advisors / grants
    uint256 public lastClaimTime; // Last time a key was claimed
    address public gkTeamClaimContract;
    bool public randomClaimBool; // true if random claim is enabled for team (only used for testing consistency)

    // Whitelisted transfer (true / false)
    mapping(address => bool) public whitelistedTransfer;

    // true transfers are paused
    bool public pausedTransfer;
    address public signerAddress;

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    event BidCancelled(bytes32 indexed hash);
    event NewClaimableGenKey(address indexed _user, uint256 _amount, uint256 _blockNum);
    event ClaimedGenesisKey(address indexed _user, uint256 _amount, uint256 _blockNum, bool _whitelist);

    modifier onlyOwner() {
        require(msg.sender == owner, "GEN_KEY: !AUTH");
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        address _wethAddress,
        address _multiSig,
        uint256 _auctionSeconds,
        bool _randomClaimBool,
        string memory baseURI
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721A_init(name, symbol, baseURI);
        __UUPSUpgradeable_init();

        wethAddress = _wethAddress;
        startPublicSale = false;
        publicSaleDurationSeconds = _auctionSeconds;
        owner = msg.sender;
        multiSig = _multiSig;
        remainingTeamAdvisorGrant = 250; // 250 genesis keys allocated
        lastClaimTime = block.timestamp;
        randomClaimBool = _randomClaimBool;
        signerAddress = 0xB6D66FcF587D68b8058f03b88d35B36E38C5344f;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // governance functions =================================================================
    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        if (totalSupply() != 10000 && !whitelistedTransfer[from]) revert PausedTransfer();
        _transfer(from, to, tokenId);
    }

    function setMultiSig(address _newMS) external onlyOwner {
        multiSig = _newMS;
    }

    function setGenesisKeyMerkle(address _newMK) external onlyOwner {
        genesisKeyMerkle = _newMK;
    }

    function setPublicSaleDuration(uint256 _seconds) external onlyOwner {
        publicSaleDurationSeconds = _seconds;
    }

    function setWhitelist(address _address, bool _val) external onlyOwner {
        whitelistedTransfer[_address] = _val;
    }

    function setSigner(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    // initial weth price is the high price (starting point)
    // final weth price is the lowest floor price we allow
    // num keys for sale is total keys allowed to mint
    function initializePublicSale(uint256 _initialWethPrice, uint256 _finalWethPrice) external onlyOwner {
        require(!startPublicSale, "GEN_KEY: sale already initialized");
        initialWethPrice = _initialWethPrice;
        finalWethPrice = _finalWethPrice;
        publicSaleStartSecond = block.timestamp;
        startPublicSale = true;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function verifySignature(bytes32 hash, bytes memory signature) public view returns (bool) {
        return signerAddress == hash.recover(signature);
    }

    /**
     @notice helper function transfer WETH tokens to reduce contract size
     @param _user user transferring tokens
     @param _amount number of WETH tokens being transferred
    */
    function transferWethTokens(address _user, uint256 _amount) private returns (bool) {
        require(_amount != 0);
        return IERC20Upgradeable(wethAddress).transferFrom(_user, multiSig, _amount);
    }

    // =========POST WHITELIST CLAIM KEY ==========================================================================
    /**
     @notice allows winning keys to be self-minted by winners
    */
    function claimKey(address recipient, uint256 _eth) external payable override nonReentrant returns (bool) {
        // checks
        require(msg.sender == genesisKeyMerkle);
        require(!startPublicSale, "GEN_KEY: only during blind");

        // effects
        // interactions
        require(msg.value >= _eth); // transfer WETH token
        _mint(recipient, 1, "", false);

        randomTeamGrant(recipient);

        if (msg.value > _eth) {
            safeTransferETH(recipient, msg.value - _eth);
        }

        emit ClaimedGenesisKey(recipient, _eth, block.number, true);

        return true;
    }

    // pseudo-randomly assign a team to a key
    function randomTeamGrant(address _recipient) private {
        if (
            remainingTeamAdvisorGrant != 0 &&
            (uint256(uint160(_recipient)) + block.timestamp) % 5 == 0 &&
            randomClaimBool
        ) {
            remainingTeamAdvisorGrant -= 1;
            lastClaimTime = block.timestamp;

            _mint(gkTeamClaimContract, 1, "", false);
            IGkTeamClaim(gkTeamClaimContract).addTokenId(totalSupply());
            emit ClaimedGenesisKey(gkTeamClaimContract, 0, block.number, false);
        }
    }

    function setGkTeamClaim(address _gkTeamClaimContract) external onlyOwner {
        gkTeamClaimContract = _gkTeamClaimContract;
    }

    /**
     @notice sends grant key to end user for team / advisors / grants
    */
    function claimGrantKey(address[] calldata receivers) external {
        require(msg.sender == multiSig, "GEN_KEY: !AUTH");
        require(remainingTeamAdvisorGrant >= receivers.length);

        remainingTeamAdvisorGrant -= receivers.length;

        for (uint256 i = 0; i < receivers.length; i++) {
            _mint(receivers[i], 1, "", false);

            emit ClaimedGenesisKey(receivers[i], 0, block.number, false);
        }
    }

    /// @notice Transfers ETH to the recipient address
    /// @dev Fails with `STE`
    /// @param to The destination of the transfer
    /// @param value The value to be transferred
    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{ value: value }(new bytes(0));
        require(success, "STE");
    }

    // helper function for transferring eth from the public auction to MS
    function transferETH() external onlyOwner {
        safeTransferETH(multiSig, address(this).balance);
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

    // ========= PUBLIC SALE =================================================================
    // external function for public sale of genesis keys
    function publicExecuteBid(bytes32 hash, bytes memory signature) external payable nonReentrant {
        // checks
        require(!isContract(msg.sender), "GEN_KEY: !CONTRACT");
        require(verifySignature(hash, signature) && !cancelledOrFinalized[hash], "GEN_KEY: INVALID SIG");
        require(startPublicSale, "GEN_KEY: invalid time");
        require(remainingTeamAdvisorGrant + totalSupply() != 10000, "GEN_KEY: no more keys left for sale");

        uint256 currentWethPrice = getCurrentPrice();
        cancelledOrFinalized[hash] = true;

        // if ETH is sent, we use it
        if (msg.value >= currentWethPrice) {
            // send extra ETH back to user
            if (msg.value > currentWethPrice) {
                safeTransferETH(msg.sender, msg.value.sub(currentWethPrice));
            }
        } else {
            // otherwise, take WETH
            require(transferWethTokens(msg.sender, currentWethPrice), "GEN_KEY: !weth");

            // send extra ETH back to user
            if (msg.value > 0) {
                safeTransferETH(msg.sender, msg.value);
            }
        }

        // interactions
        _mint(msg.sender, 1, "", false);

        randomTeamGrant(msg.sender);

        emit ClaimedGenesisKey(msg.sender, currentWethPrice, block.number, false);
    }

    // public function for returning the current price
    function getCurrentPrice() public view returns (uint256) {
        require(startPublicSale, "GEN_KEY: invalid time");
        uint256 secondsPassed = 0;

        secondsPassed = block.timestamp - publicSaleStartSecond;

        if (secondsPassed >= publicSaleDurationSeconds) {
            return finalWethPrice;
        } else {
            uint256 totalPriceChange = initialWethPrice.sub(finalWethPrice);
            uint256 currentPriceChange = totalPriceChange.mul(secondsPassed).div(publicSaleDurationSeconds);
            uint256 currentPrice = initialWethPrice.sub(currentPriceChange);

            return currentPrice;
        }
    }
}
