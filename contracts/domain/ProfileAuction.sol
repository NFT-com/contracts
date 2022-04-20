// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfileHelper.sol";
<<<<<<< HEAD
import "../interface/IGenesisKeyStake.sol";
import "./StringUtils.sol";
=======
import "../interface/INftProfile.sol";
import "../interface/IGenesisKeyStake.sol";
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
<<<<<<< HEAD
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

interface INftProfile {
    function createProfile(
        address receiver,
        string memory _profileURI,
        uint256 _expiry
    ) external;

    function totalSupply() external view returns (uint256);

    function extendLicense(
        string memory _profileURI,
        uint256 _duration,
        address _licensee
    ) external;

    function purchaseExpiredProfile(
        string memory _profileURI,
        uint256 _duration,
        address _receiver
    ) external;

    function tokenUsed(string memory _string) external view returns (bool);

    function profileOwner(string memory _string) external view returns (address);
}

contract ProfileAuction is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using StringUtils for *;
    using ECDSAUpgradeable for bytes32;

    address public governor;
    address public owner;
    address public nftErc20Contract;
=======

contract ProfileAuction is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    address public governor;
    address public owner;
    address public nftToken;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    address public nftProfile;
    address public genesisStakingContract;
    address public nftBuyer;
    address public nftProfileHelperAddress;
    address public genesisKeyContract;

<<<<<<< HEAD
    uint256 public yearlyFee; // public fee in nft token for mint price
    uint256 public yearsToOwn; // number of years of license to pay to own a profile
=======
    uint256 public publicFee; // public fee in nft token for mint price
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    bool public publicMintBool; // true to allow public mint
    bool public genKeyWhitelistOnly; // true to only allow merkle claims

    mapping(uint256 => uint256) public genesisKeyClaimNumber; // genKey tokenId => number of profiles claimed
<<<<<<< HEAD
    mapping(uint256 => uint256) public lengthPremium; // premium multiple for profile length
    mapping(string => uint256) public ownedProfileStake; // genKey tokenId => xNftKey staked
    address public signerAddress;

    mapping(bytes32 => bool) public cancelledOrFinalized; // used hash

    event UpdatedProfileStake(string _profileUrl, uint256 _stake);
    event MintedProfile(address _user, string _val, uint256 tokenId, uint256 _duration, uint256 _fee);

    event ExtendLicense(address _receiver, string _profileUrl, uint256 _duration, uint256 _fee, bool _expired);
=======

    event MintedProfile(address _user, string _val);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

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
<<<<<<< HEAD
        address _nftErc20Contract,
=======
        address _nftToken,
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
        address _nftProfile,
        address _governor,
        address _nftProfileHelperAddress,
        address _nftBuyer,
        address _genesisKeyContract,
        address _genesisStakingContract
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

<<<<<<< HEAD
        nftErc20Contract = _nftErc20Contract;
=======
        nftToken = _nftToken;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
        nftProfile = _nftProfile;
        nftProfileHelperAddress = _nftProfileHelperAddress;

        nftBuyer = _nftBuyer;
        owner = msg.sender;
        governor = _governor;
        genesisKeyContract = _genesisKeyContract;
        genesisStakingContract = _genesisStakingContract;
        genKeyWhitelistOnly = true;
<<<<<<< HEAD

        lengthPremium[1] = 1024;
        lengthPremium[2] = 512;
        lengthPremium[3] = 128;
        lengthPremium[4] = 32;
        yearsToOwn = 2;

        signerAddress = 0xB6D66FcF587D68b8058f03b88d35B36E38C5344f;
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
<<<<<<< HEAD
     @notice helper function transfer NFT tokens
=======
     @notice helper function transfer NFT tokens to reduce contract size
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
     @param _user user transferring tokens
     @param _amount number of NFT tokens being transferred
    */
    function transferNftTokens(address _user, uint256 _amount) private returns (bool) {
<<<<<<< HEAD
        return IERC20Upgradeable(nftErc20Contract).transferFrom(_user, nftBuyer, _amount);
=======
        return IERC20Upgradeable(nftToken).transferFrom(_user, nftBuyer, _amount);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
<<<<<<< HEAD
        return IERC20PermitUpgradeable(nftErc20Contract).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
=======
        return IERC20PermitUpgradeable(nftToken).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function validURI(string memory _name) private view returns (bool) {
        return INftProfileHelper(nftProfileHelperAddress)._validURI(_name);
    }

    // GOV FUNCTIONS
    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

<<<<<<< HEAD
    function setSigner(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    function verifySignature(bytes32 hash, bytes memory signature) public view returns (bool) {
        return signerAddress == hash.recover(signature);
    }

    function setLengthPremium(uint256 _length, uint256 _premium) external onlyGovernor {
        lengthPremium[_length] = _premium;
    }

    function setYearlyFee(uint256 _fee) external onlyGovernor {
        yearlyFee = _fee;
    }

    function setYearsToOwn(uint256 _years) external onlyGovernor {
        yearsToOwn = _years;
=======
    function setPublicFee(uint256 _fee) external onlyGovernor {
        publicFee = _fee;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function setGenKeyWhitelistOnly(bool _genKeyWhitelistOnly) external onlyGovernor {
        genKeyWhitelistOnly = _genKeyWhitelistOnly;
    }

    function setPublicMint(bool _val) external onlyGovernor {
        publicMintBool = _val;
    }

<<<<<<< HEAD
    function hashTransaction(address sender, string memory profileUrl) private pure returns (bytes32) {
        bytes32 hash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(sender, profileUrl)))
        );

        return hash;
    }

=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
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
<<<<<<< HEAD
        address recipient,
        bytes32 hash,
        bytes memory signature
=======
        address recipient
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    ) external validAndUnusedURI(profileUrl) nonReentrant {
        // checks
        require(
            IERC721EnumerableUpgradeable(genesisKeyContract).ownerOf(tokenId) == recipient,
            "nft.com: must be genkey owner"
        );
<<<<<<< HEAD
        require(verifySignature(hash, signature) && !cancelledOrFinalized[hash], "Invalid signature");
        require(hashTransaction(msg.sender, profileUrl) == hash, "Hash mismatch");
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
        uint256 profilesAllowed = genKeyWhitelistOnly ? 2 : 7;
        require(genesisKeyClaimNumber[tokenId] != profilesAllowed);

        // effects
        genesisKeyClaimNumber[tokenId] += 1;

        // interactions
<<<<<<< HEAD
        INftProfile(nftProfile).createProfile(
            recipient,
            profileUrl,
            genesisKeyClaimNumber[tokenId] <= 2 ? 365 days * 1000 : 365 days
        );

        emit MintedProfile(recipient, profileUrl, INftProfile(nftProfile).totalSupply() - 1, 365 days, 0);
=======
        INftProfile(nftProfile).createProfile(recipient, profileUrl);

        emit MintedProfile(recipient, profileUrl);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }

    function publicMint(
        string memory profileUrl,
<<<<<<< HEAD
        uint256 duration,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes32 hash,
        bytes memory signature
    ) external nonReentrant validAndUnusedURI(profileUrl) {
        // checks
        require(publicMintBool, "nft.com: public minting is disabled");
        require(verifySignature(hash, signature) && !cancelledOrFinalized[hash], "Invalid signature");
        require(hashTransaction(msg.sender, profileUrl) == hash, "Hash mismatch");

        // effects
        // interactions
        if (IERC20Upgradeable(nftErc20Contract).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "nft.com: insufficient funds");

        INftProfile(nftProfile).createProfile(msg.sender, profileUrl, duration);

        emit MintedProfile(
            msg.sender,
            profileUrl,
            INftProfile(nftProfile).totalSupply() - 1,
            duration,
            getFee(profileUrl, duration)
        );
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
    function extendLicense(
        string memory profileUrl,
        uint256 duration,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        if (IERC20Upgradeable(nftErc20Contract).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "pa: insufficient funds");

        INftProfile(nftProfile).extendLicense(profileUrl, duration, msg.sender);

        emit ExtendLicense(msg.sender, profileUrl, duration, getFee(profileUrl, duration), false);
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
        if (IERC20Upgradeable(nftErc20Contract).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, getFee(profileUrl, duration)), "pa: insufficient funds");

        INftProfile(nftProfile).purchaseExpiredProfile(profileUrl, duration, msg.sender);

        emit ExtendLicense(msg.sender, profileUrl, duration, getFee(profileUrl, duration), true);
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
=======
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

        require(transferNftTokens(msg.sender, publicFee), "nft.com: insufficient funds");

        INftProfile(nftProfile).createProfile(msg.sender, profileUrl);

        emit MintedProfile(msg.sender, profileUrl);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }
}
