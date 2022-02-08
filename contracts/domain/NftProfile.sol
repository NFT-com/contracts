// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfile.sol";
import "../oz_modified/ERC721EnumerableUpgradeable.sol";
import "../royalties/IERC2981Royalties.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract NftProfile is
    Initializable,
    ERC721EnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    INftProfile,
    IERC2981Royalties
{
    using SafeMathUpgradeable for uint256;

    struct RoyaltyInfo {
        address recipient;
        uint24 amount;
    }

    RoyaltyInfo private _royalties;
    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;
    mapping(uint256 => Bid) internal _profileDetails;

    uint256 public protocolFee;
    address public profileAuctionContract;
    address public nftErc20Contract;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        address _nftErc20Contract
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721Enumerable_init();
        __ERC721_init(name, symbol);
        __UUPSUpgradeable_init();
        protocolFee = 200; // 2% fee

        owner = msg.sender;
        nftErc20Contract = _nftErc20Contract;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice helper function to finalize a URI in storage
     @param _tokenId the ID of the NFT.com profile
     @param _tokenURI the string name of a NFT.com profile
    */
    function setTokenURI(uint256 _tokenId, string memory _tokenURI) private {
        require(_exists(_tokenId));
        require(_tokenUsedURIs[_tokenURI] == 0);

        _tokenURIs[_tokenId] = _tokenURI;

        // adds 1 to preserve 0 being the default not found case
        _tokenUsedURIs[_tokenURI] = _tokenId.add(1);
    }

    /**
     @dev transfers trademarked profile to recipient
     @param _profile profile url being transferred
     @param _to receiver of profile
    */
    function tradeMarkTransfer(string memory _profile, address _to) external onlyOwner {
        require(_tokenUsedURIs[_profile] != 0);
        uint256 tokenId = _tokenUsedURIs[_profile].sub(1);

        _transfer(ERC721Upgradeable.ownerOf(tokenId), _to, tokenId);
    }

    /**
     @dev Sets token royalties
     @param recipient recipient of the royalties
     @param value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    */
    function _setRoyalties(address recipient, uint256 value) internal {
        require(value <= 10000, "NFT.com: ERC-2981 Royalty Too High");
        _royalties = RoyaltyInfo(recipient, uint24(value));
    }

    /* @inheritdoc IERC2981Royalties */
    function royaltyInfo(uint256, uint256 value)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        RoyaltyInfo memory royalties = _royalties;
        receiver = royalties.recipient;
        royaltyAmount = (value * royalties.amount) / 10000;
    }

    /* @inheritdoc ERC165Upgradeable */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return interfaceId == type(IERC2981Royalties).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     @notice Allows to set the royalties on the contract
     @dev This function in a real contract should be protected with a onlOwner (or equivalent) modifier
     @param recipient the royalties recipient
     @param value royalties value (between 0 and 10000)
    */
    function setRoyalties(address recipient, uint256 value) external onlyOwner {
        _setRoyalties(recipient, value);
    }

    /**
     @notice returns details about a specific NFT.com profile
     @param _tokenId the ID of the NFT.com profile
     @return details about the NFT.com profile
    */
    function profileDetails(uint256 _tokenId) external view override returns (Bid memory) {
        require(_exists(_tokenId));
        return _profileDetails[_tokenId];
    }

    /**
     @notice checks if a profile exists
     @param _string profile URI
     @return true is a profile exists and is minted for a given string
    */
    function tokenUsed(string memory _string) external view override returns (bool) {
        return _tokenUsedURIs[_string] != 0;
    }

    /**
     @notice returns the tokenId of a particular profile
     @param _string profile URI
     @return the tokenId associated with a profile NFT
    */
    function getTokenId(string memory _string) external view returns (uint256) {
        return _tokenUsedURIs[_string].sub(1);
    }

    /**
     @notice helper function that sets the profile auction (split deployment)
     @param _profileAuctionContract address of the profile auction contract
    */
    function setProfileAuction(address _profileAuctionContract) external onlyOwner {
        profileAuctionContract = _profileAuctionContract;
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    /**
     @notice helper function used to mint profile, set URI, bid details
     @param _receiver the user who bought the profile
     @param _nftTokens number of NFT.com tokens staked
     @param _profileURI profile username
    */
    function createProfile(
        address _receiver,
        uint256 _nftTokens,
        string memory _profileURI,
        uint256 _blockMinted
    ) external override {
        require(msg.sender == profileAuctionContract);
        uint256 preSupply = totalSupply();

        _mint(_receiver, preSupply);
        setTokenURI(preSupply, _profileURI);
        _profileDetails[preSupply] = Bid(_nftTokens, _blockMinted, _profileURI);
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
        return IERC20PermitUpgradeable(nftErc20Contract).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
    }

    /**
     @notice returns URI for a profile token
     @param tokenId the ID of the NFT.com profile
     @return URI string, which contains JSON spec
    */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "!exists");
        return string(abi.encodePacked(_baseURI(), _tokenURIs[tokenId]));
    }
}
