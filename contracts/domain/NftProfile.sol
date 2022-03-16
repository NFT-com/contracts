// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfile.sol";
import "../oz_modified/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract NftProfile is
    Initializable,
    ERC721EnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    INftProfile
{
    using SafeMathUpgradeable for uint256;

    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;

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

    function profileOwner(string memory _string) external view returns (address) {
        return ownerOf(_tokenUsedURIs[_string].sub(1));
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
     @param _profileURI profile username
    */
    function createProfile(address _receiver, string memory _profileURI) external override {
        require(msg.sender == profileAuctionContract);
        uint256 preSupply = totalSupply();

        _mint(_receiver, preSupply);
        setTokenURI(preSupply, _profileURI);
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
