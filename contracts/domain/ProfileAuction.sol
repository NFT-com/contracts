// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfileHelper.sol";
import "../interface/INftProfile.sol";
import "../interface/IGenesisKeyStake.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract ProfileAuction is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using StringUtils for *;

    address public governor;
    address public owner;
    address public nftToken;
    address public nftProfile;
    address public genesisStakingContract;
    address public nftBuyer;
    address public nftProfileHelperAddress;
    address public genesisKeyContract;

    uint256 public yearlyFee; // public fee in nft token for mint price
    uint256 public yearsToOwn; // number of years of rent to pay to own a profile
    bool public publicMintBool; // true to allow public mint
    bool public genKeyWhitelistOnly; // true to only allow merkle claims

    mapping(uint256 => uint256) public genesisKeyClaimNumber; // genKey tokenId => number of profiles claimed
    mapping(uint256 => uint256) public lengthPremium; // premium multiple for profile length
    mapping(string => uint256) public ownedProfileStake; // genKey tokenId => xNftKey staked

    event UpdatedProfileStake(string _profileUrl, uint256 _stake);
    event MintedProfile(address _user, string _val, uint256 _duration, uint256 _fee);

    event ExtendRent(address _receiver, string _profileUrl, uint256 _duration, uint256 _fee, bool _expired);

    modifier validAndUnusedURI(string memory _profileURI) {
        require(validURI(_profileURI));
        require(!INftProfile(nftProfile).tokenUsed(_profileURI));
        _;
    }

    modifier onlyGovernor() {
        require(msg.sender == governor);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function initialize(
        address _nftToken,
        address _nftProfile,
        address _governor,
        address _nftProfileHelperAddress,
        address _nftBuyer,
        address _genesisKeyContract,
        address _genesisStakingContract
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        nftToken = _nftToken;
        nftProfile = _nftProfile;
        nftProfileHelperAddress = _nftProfileHelperAddress;

        nftBuyer = _nftBuyer;
        owner = msg.sender;
        governor = _governor;
        genesisKeyContract = _genesisKeyContract;
        genesisStakingContract = _genesisStakingContract;
        genKeyWhitelistOnly = true;

        lengthPremium[1] = 1024;
        lengthPremium[2] = 512;
        lengthPremium[3] = 128;
        lengthPremium[4] = 32;
        yearsToOwn = 2;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice helper function transfer NFT tokens to reduce contract size
     @param _user user transferring tokens
     @param _amount number of NFT tokens being transferred
    */
    function transferNftTokens(address _user, uint256 _amount) private returns (bool) {
        return IERC20Upgradeable(nftToken).transferFrom(_user, nftBuyer, _amount);
    }

    /**
     @notice helper function to add permit
    */
    function permitNFT(
        address _owner,
        address spender,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private {
        return IERC20PermitUpgradeable(nftToken).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
    }

    function validURI(string memory _name) private view returns (bool) {
        return INftProfileHelper(nftProfileHelperAddress)._validURI(_name);
    }

    // GOV FUNCTIONS
    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    function setLengthPremium(uint256 _length, uint256 _premium) external onlyGovernor {
        lengthPremium[_length] = _premium;
    }

    function setYearlyFee(uint256 _fee) external onlyGovernor {
        yearlyFee = _fee;
    }

    function setYearsToOwn(uint256 _years) external onlyGovernor {
        yearsToOwn = _years;
    }

    function setGenKeyWhitelistOnly(bool _genKeyWhitelistOnly) external onlyGovernor {
        genKeyWhitelistOnly = _genKeyWhitelistOnly;
    }

    function setPublicMint(bool _val) external onlyGovernor {
        publicMintBool = _val;
    }

    // CLAIM FUNCTIONS
    /**
     * @dev allows gen key holder to claim a profile
     * @param profileUrl profileUrl to claim
     * @param tokenId tokenId of genesis key owned
     * @param recipient user who is calling the claim function
     */
    function genesisKeyClaimProfile(
        string memory profileUrl,
        uint256 tokenId,
        address recipient
    ) external validAndUnusedURI(profileUrl) nonReentrant {
        // checks
        require(
            IERC721EnumerableUpgradeable(genesisKeyContract).ownerOf(tokenId) == recipient,
            "nft.com: must be genkey owner"
        );
        uint256 profilesAllowed = genKeyWhitelistOnly ? 2 : 7;
        require(genesisKeyClaimNumber[tokenId] != profilesAllowed);

        // effects
        genesisKeyClaimNumber[tokenId] += 1;

        // interactions
        INftProfile(nftProfile).createProfile(recipient, profileUrl, 365 days);

        emit MintedProfile(recipient, profileUrl, 365 days, 0);
    }

    function publicMint(
        string memory profileUrl,
        uint256 duration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant validAndUnusedURI(profileUrl) {
        // checks
        require(publicMintBool, "nft.com: public minting is disabled");
        // effects
        // interactions
        if (IERC20Upgradeable(nftToken).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "nft.com: insufficient funds");

        INftProfile(nftProfile).createProfile(msg.sender, profileUrl, duration);

        emit MintedProfile(msg.sender, profileUrl, duration, getFee(profileUrl, duration));
    }

    function getFee(string memory profileUrl, uint256 duration) public view returns (uint256) {
        uint256 baseFee = (yearlyFee * duration) / 365 days;
        uint256 premium = lengthPremium[profileUrl.strlen()];

        // if premium is not set, then use base fee, otherwise, multiply
        return premium == 0 ? baseFee : baseFee * premium;
    }

    /**
     * @dev allows any user to pay to extend a profile
     * @param profileUrl profileUrl to extend
     * @param duration number of seconds to extend
     */
    function extendRent(
        string memory profileUrl,
        uint256 duration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        if (IERC20Upgradeable(nftToken).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "pa: insufficient funds");

        INftProfile(nftProfile).extendRent(profileUrl, duration, msg.sender);

        emit ExtendRent(msg.sender, profileUrl, duration, getFee(profileUrl, duration), false);
    }

    function purchaseExpiredProfile(
        string memory profileUrl,
        uint256 duration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // checks
        require(publicMintBool, "pa: public minting is disabled");
        require(ownedProfileStake[profileUrl] == 0, "pa: profile is already staked");

        // effects
        // interactions
        if (IERC20Upgradeable(nftToken).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "pa: insufficient funds");

        INftProfile(nftProfile).purchaseExpiredProfile(profileUrl, duration, msg.sender);

        emit ExtendRent(msg.sender, profileUrl, duration, getFee(profileUrl, duration), true);
    }

    function ownProfile(string memory profileUrl) external nonReentrant {
        // checks
        require(publicMintBool, "op: public minting is disabled");
        uint256 xNftKeyReq = (getFee(profileUrl, 365 days) *
            yearsToOwn *
            IGenesisKeyStake(genesisStakingContract).totalSupply()) /
            IGenesisKeyStake(genesisStakingContract).totalStakedNftCoin();
        require(xNftKeyReq != 0, "op: !0");

        // effects
        ownedProfileStake[profileUrl] = xNftKeyReq;

        // interactions
        require(
            IERC20Upgradeable(genesisStakingContract).transferFrom(msg.sender, address(this), xNftKeyReq),
            "op: insufficient funds"
        );

        emit UpdatedProfileStake(profileUrl, xNftKeyReq);
    }

    function redeemProfile(string memory profileUrl) public nonReentrant {
        // checks
        require(publicMintBool, "pa: public minting is disabled");
        require(ownedProfileStake[profileUrl] != 0, "op: profile is not staked");
        require(INftProfile(nftProfile).profileOwner(profileUrl) == msg.sender, "op: profile is not owned by user");

        // effects
        // interactions
        require(
            IERC20Upgradeable(genesisStakingContract).transferFrom(
                address(this),
                msg.sender,
                ownedProfileStake[profileUrl]
            )
        );

        ownedProfileStake[profileUrl] = 0;
        emit UpdatedProfileStake(profileUrl, 0);
    }
}
