// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfileHelper.sol";
import "../interface/INftProfile.sol";
import "../interface/IGenesisKeyStake.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract ProfileAuction is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    address public governor;
    address public owner;
    address public nftToken;
    address public nftProfile;
    address public genesisStakingContract;
    address public nftBuyer;
    address public nftProfileHelperAddress;
    address public genesisKeyContract;
    address public merkleDistributorProfile;
    
    uint256 public publicFee;   // public fee in nft token for mint price
    bool public publicMintBool;     // true to allow public mint

    mapping(uint256 => uint256) public genesisKeyClaimNumber; // genKey tokenId => number of profiles claimed

    event MintedProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);

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
        address _genesisStakingContract,
        address _merkleDistributorProfile
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
        merkleDistributorProfile = _merkleDistributorProfile;
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

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    // external function used to determine if _user is a genesis key holder or has staked their key
    function genKeyOwner(address _user) public view returns (bool) {
        return
            IERC721EnumerableUpgradeable(genesisKeyContract).balanceOf(_user) != 0 ||
            IGenesisKeyStake(genesisStakingContract).stakedAddress(_user) != 0;
    }

    function validGenKey(address _user, bool _genKey) private view returns (bool) {
        if (_genKey) {
            return genKeyOwner(_user);
        }

        return true;
    }

    function setPublicFee(uint256 _fee) external onlyGovernor {
        publicFee = _fee;
    }

    /**
     * @dev allows gen key holder to claim a profile according to merkle tree
     * @param tokenId tokenId of genesis key owned
     * @param profileUrl profileUrl to claim
     * @param recipient user who is calling the claim function 
     */
    function genesisKeyMerkleClaim(
        uint256 tokenId,
        string memory profileUrl,
        address recipient
    ) external nonReentrant returns (bool) {
        if (
            msg.sender == merkleDistributorProfile &&
            // recipient must have specified genesis key
            IERC721EnumerableUpgradeable(genesisKeyContract).ownerOf(tokenId) == recipient &&
            genesisKeyClaimNumber[tokenId] != 7
        ) {
            genesisKeyClaimNumber[tokenId] += 1;

            INftProfile(nftProfile).createProfile(recipient, 0, profileUrl, block.number);
            emit MintedProfile(recipient, profileUrl, 0, block.number);

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev allows gen key holder to claim a profile
     * @param profileUrl profileUrl to claim
     * @param tokenId tokenId of genesis key owned
     * @param v uint8 v of signature
     * @param r bytes32 r of signature
     * @param s bytes32 s of signature
     */
    function genesisKeyClaimProfile(
        string memory profileUrl,
        uint256 tokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // checks
        require(
            IERC721EnumerableUpgradeable(genesisKeyContract).ownerOf(tokenId) == msg.sender,
            "nft.com: must be genkey owner"
        );
        require(
            genesisKeyClaimNumber[tokenId] != 7,
            "nft.com: must not exceed 7 profile mints"
        );

        // effects
        genesisKeyClaimNumber[tokenId] += 1;

        // interactions
        if (IERC20Upgradeable(nftToken).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        INftProfile(nftProfile).createProfile(msg.sender, 0, profileUrl, block.number);

        emit MintedProfile(msg.sender, profileUrl, 0, block.number);
    }

    function setPublicMint(bool _val) external onlyGovernor {
        publicMintBool = _val;
    }

    function publicMint(
        string memory profileUrl,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // checks
        require(publicMintBool, "nft.com: public minting is disabled");
        // effects
        // interactions
        if (IERC20Upgradeable(nftToken).allowance(msg.sender, address(this)) == 0) {
            permitNFT(msg.sender, address(this), v, r, s); // approve NFT token
        }

        require(transferNftTokens(msg.sender, publicFee), "nft.com: insufficient funds");

        INftProfile(nftProfile).createProfile(msg.sender, 0, profileUrl, block.number);

        emit MintedProfile(msg.sender, profileUrl, 0, block.number);
    }
}
