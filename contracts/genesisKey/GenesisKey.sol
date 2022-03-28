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

// this contract will contain logic related to the initial minting of Genesis Keys
// the keys will be split into 2 tranches
// tranch #1 will be a blind auction
// tranch #2 will be a dutch auction
// there will only ever be 10,000 genesis keys maximum
// depending on auction participation, there may be less
// assumes we use WETH as the token of denomination

contract GenesisKey is Initializable, ERC721AUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, IGenesisKey {
    using SafeMathUpgradeable for uint256;

    address public wethAddress;
    address public owner;
    address public multiSig;
    address public genesisKeyMerkle;
    bool public startPublicSale; // global state indicator if public sale is happening
    uint256 public publicSaleStartSecond; // second public sale starts
    uint256 public publicSaleDurationSeconds; // length of public sale in seconds
    uint256 public initialWethPrice; // initial price of genesis keys in Weth
    uint256 public finalWethPrice; // final price of genesis keys in Weth

    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized bid, by hash
    mapping(bytes32 => uint256) public claimableBlock; // Claimable bid (0 = not claimable, > 0 = claimable), by hash
    uint256 public remainingTeamAdvisorGrant; // Genesis Keys reserved for team / advisors / grants
    uint256 public lastClaimTime; // Last time a key was claimed
    address public gkTeamClaimContract;

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
        uint256 _auctionSeconds
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721AUpgradeable_init(name, symbol, "ipfs://");
        __UUPSUpgradeable_init();

        wethAddress = _wethAddress;
        startPublicSale = false;
        publicSaleDurationSeconds = _auctionSeconds;
        owner = msg.sender;
        multiSig = _multiSig;
        remainingTeamAdvisorGrant = 250; // 250 genesis keys allocated
        lastClaimTime = block.timestamp;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // governance functions =================================================================
    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
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

    // TODO: delete for PROD!!!
    function resetPublicSale() external {
        require(startPublicSale, "GEN_KEY: sale must have started already");
        initialWethPrice = 0;
        finalWethPrice = 0;
        publicSaleStartSecond = 0;
        startPublicSale = false;
    }

    // ======================================================================================
    function _domainSeparatorV4() internal view returns (bytes32) {
        bytes32 _TYPE_HASH = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

        return
            keccak256(
                abi.encode(_TYPE_HASH, keccak256("NFT.com Genesis Key"), keccak256("1"), block.chainid, address(this))
            );
    }

    function _hashTypedDataV4ProfileAuction(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSAUpgradeable.toTypedDataHash(_domainSeparatorV4(), structHash);
    }

    /**
     * @dev Validate a provided previously signed bid, hash, and signature.
     * @param hash Bid hash (already calculated, passed to avoid recalculation)
     * @param _wethTokens weth tokens for bid
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function validateBid_(
        bytes32 hash,
        uint256 _wethTokens,
        address _owner,
        Sig memory sig
    ) internal view returns (bool) {
        /* Bid must have valid token amount. */
        if (_wethTokens == 0) {
            return false;
        }

        /* Bid must have not been canceled or already filled. */
        if (cancelledOrFinalized[hash]) {
            return false;
        }

        /* Bid authentication. Bid must be ECDSA-signed by owner. */
        bytes32 hashV4 = _hashTypedDataV4ProfileAuction(hash);

        if (ECDSAUpgradeable.recover(hashV4, sig.v, sig.r, sig.s) == _owner) {
            return true;
        }

        return false;
    }

    // primarily used to query
    function getStructHash(uint256 _wethTokens, address _owner) public pure returns (bytes32) {
        bytes32 _PERMIT_TYPEHASH = keccak256("GenesisBid(uint256 _wethTokens,address _owner)");
        return keccak256(abi.encode(_PERMIT_TYPEHASH, _wethTokens, _owner));
    }

    function validateBid(
        uint256 _wethTokens,
        address _owner,
        Sig memory sig
    ) external view returns (bool) {
        bytes32 hash = getStructHash(_wethTokens, _owner);

        return validateBid_(hash, _wethTokens, _owner, sig);
    }

    /**
     * @dev Assert a whitelist bid is valid
     * @param _wethTokens tokens WETH
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function requireValidBid_(
        uint256 _wethTokens,
        address _owner,
        Sig memory sig
    ) internal view returns (bytes32) {
        bytes32 hash = getStructHash(_wethTokens, _owner);

        require(validateBid_(hash, _wethTokens, _owner, sig), "GEN_KEY: INVALID SIG");
        return hash;
    }

    function cancelBid(
        uint256 _wethTokens,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        return cancelBid_(_wethTokens, _owner, Sig(v, r, s));
    }

    /**
     * @dev Cancel an bid, preventing it from being matched. Must be called by the maker of the bid
     * @param _wethTokens weth tokens for bid
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function cancelBid_(
        uint256 _wethTokens,
        address _owner,
        Sig memory sig
    ) internal {
        /* CHECKS */

        /* Calculate bid hash. */
        bytes32 hash = requireValidBid_(_wethTokens, _owner, sig);

        require(msg.sender == _owner); // must be owner
        require(claimableBlock[hash] == 0); // must not be claimable

        /* EFFECTS */

        /* Mark bid as cancelled, preventing it from being matched. */
        cancelledOrFinalized[hash] = true;

        /* Log cancel event. */
        emit BidCancelled(hash);
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
            lastClaimTime > 1 minutes
        ) {
            remainingTeamAdvisorGrant -= 1;
            lastClaimTime = block.timestamp;

            _mint(gkTeamClaimContract, 1, "", false);
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

        remainingTeamAdvisorGrant = remainingTeamAdvisorGrant.sub(receivers.length);

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

    // ========= PUBLIC SALE =================================================================
    // external function for public sale of genesis keys
    function publicExecuteBid() external payable nonReentrant {
        // checks
        require(startPublicSale, "GEN_KEY: invalid time");
        require(remainingTeamAdvisorGrant + totalSupply() != 10000, "GEN_KEY: no more keys left for sale");

        uint256 currentWethPrice = getCurrentPrice();

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
