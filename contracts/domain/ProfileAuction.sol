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

    uint256 public publicFee; // public fee in nft token for mint price
    bool public publicMintBool; // true to allow public mint
    bool public genKeyWhitelistOnly; // true to only allow merkle claims

    mapping(uint256 => uint256) public genesisKeyClaimNumber; // genKey tokenId => number of profiles claimed

    event MintedProfile(address _user, string _val);

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

    function setPublicFee(uint256 _fee) external onlyGovernor {
        publicFee = _fee;
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
        INftProfile(nftProfile).createProfile(recipient, profileUrl);

        emit MintedProfile(recipient, profileUrl);
    }

    // mint for team and advisors
    function reservedMint(address[] memory _receivers, string[] memory _profiles) external nonReentrant onlyOwner {
        require(_receivers.length == _profiles.length);

        for (uint256 i = 0; i < _profiles.length; i++) {
            require(validURI(_profiles[i]));
            require(!INftProfile(nftProfile).tokenUsed(_profiles[i]));

            INftProfile(nftProfile).createProfile(_receivers[i], _profiles[i]);

            emit MintedProfile(_receivers[i], _profiles[i]);
        }
    }

    function publicMint(
        string memory profileUrl,
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
    }
}
