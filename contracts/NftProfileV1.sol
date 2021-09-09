// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./interface/ICreatorCoin.sol";
import "./interface/ICreatorBondingCurve.sol";
import "./CreatorCoin.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

struct Bid {
    uint256 _nftTokens;                 
    uint256 _blockMinted;
    string _profileURI;
    uint256 _blockWait;
}

contract NftProfileV1 is Initializable,
    ERC721EnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    mapping(uint256 => uint256) internal _profileOwnerFee;
    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;
    mapping(uint256 => address) internal _creatorCoinMap;
    mapping(uint256 => Bid) internal _profileDetails;

    uint256 internal protocolFee;
    address internal profileAuctionContract;
    address internal _bondingCurveContract;
    address internal nftErc20Contract;
    address internal owner;

    event NewBytes(string _val);

    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        address _nftErc20Contract,
        address __bondingCurveContract
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721Enumerable_init();
        __ERC721_init(name, symbol);
        __UUPSUpgradeable_init();
        protocolFee = 200;  // 2% fee

        owner = msg.sender;
        nftErc20Contract = _nftErc20Contract;
        _bondingCurveContract = __bondingCurveContract;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice helper function to finalize a URI in storage
     @param _tokenId the ID of the NFT.com profile
     @param _tokenURI the string name of a NFT.com profile
    */
    function setTokenURI(uint256 _tokenId, string memory _tokenURI) private {
        require(_exists(_tokenId));
        _tokenURIs[_tokenId] = _tokenURI;

        // adds 1 to preserve 0 being the default not found case
        _tokenUsedURIs[_tokenURI] = _tokenId.add(1);
    }

    /**
     @notice helper function to initialize a creator coin for a given NFT profile
     @param _tokenId the ID of the NFT.com profile
    */
    function initializeCreatorCoin(uint256 _tokenId) external {
        require(_exists(_tokenId) && _creatorCoinMap[_tokenId] == address(0x0));

        CreatorCoin creatorCoinContract = new CreatorCoin(
            address(this),
            nftErc20Contract,
            _tokenURIs[_tokenId],
            string(abi.encodePacked("@", _tokenURIs[_tokenId]))
        );

        _profileOwnerFee[_tokenId] = 1000; // default fee is 10%
        _creatorCoinMap[_tokenId] = address(creatorCoinContract);
    }

    /**
     @notice returns details about a specific NFT.com profile
     @param _tokenId the ID of the NFT.com profile
     @return details about the NFT.com profile
    */
    function profileDetails(uint256 _tokenId) external view returns (Bid memory) {
        require(_exists(_tokenId));
        return _profileDetails[_tokenId];
    }

    /**
     @notice returns the address of each profile's creator coin
     @param _tokenId the ID of the NFT.com profile
     @return the contract address for a NFT.com profile's creator coin
    */
    function creatorCoin(uint256 _tokenId) external view returns (address) {
        require(_exists(_tokenId));
        return _creatorCoinMap[_tokenId];
    }

    /**
     @notice checks if a profile exists
     @param _string profile URI
     @return true is a profile exists and is minted for a given string
    */
    function tokenUsed(string memory _string) external view returns (bool) {
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
     @notice helper function used to mint profile, set URI, bid details and the bonding curve
     @param _receiver the user who bought the profile
     @param _nftTokens number of NFT.com tokens staked
     @param _profileURI profile username
     @param _blockWait minimum block wait
    */
    function createProfile(
        address _receiver,
        uint256 _nftTokens,
        string memory _profileURI,
        uint256 _blockWait,
        uint256 _blockMinted
    ) external {
        require(msg.sender == profileAuctionContract);
        uint256 preSupply = totalSupply();

        _mint(_receiver, preSupply);
        setTokenURI(preSupply, _profileURI);
        _profileDetails[preSupply] = Bid(
            _nftTokens,
            _blockMinted,
            _profileURI,
            _blockWait
        );
    }

    /**
     @notice modifies a NFT profile's fee on their creator token
     @param _rate value from 0 - 10000, represented in basis points (BP)
     @param tokenId the ID of the NFT.com profile
    */
    function modifyProfileRate(uint256 _rate, uint256 tokenId) external {
        require(msg.sender == ownerOf(tokenId), "!owner");
        require(_rate >= 0 && _rate <= 2000, "!bounds"); // 2000 = 20%
        _profileOwnerFee[tokenId] = _rate;
    }

    /**
     @notice returns a NFT profile's fee on their creator token
     @param tokenId the ID of the NFT.com profile
     @return value from 0 - 10000, represented in basis points (BP)
    */
    function getProfileOwnerFee(uint256 tokenId) external view returns (uint256) {
        return _profileOwnerFee[tokenId];
    }

    /**
     @notice returns the protocol burn fee
     @return value from 0 - 10000, represented in basis points (BP)
    */
    function getProtocolFee() external view returns (uint256) {
        return protocolFee;
    }

    /**
     @notice bonding curve pricing for minting creator tokens
     @param _type 1 = mint, 0 = burn
     @param _amount 1 = # of NFT.com tokens sent, 0 = # of creator tokens to burn
     @return 1 = # of creator coins to mint, 0 = # of nft tokens to receive
    */
    function getPrice(uint256 _type, address _creatorCoin, uint256 _amount) private view returns (uint256) {
        return ICreatorBondingCurve(_bondingCurveContract).getPrice(_type, _creatorCoin, _amount);
    }

    /**
     @notice helper function to reduce contract size by combining call logic, assists with minting and burning
     @param _type 1 = mint, 0 = burn
     @param _amount when _type = 1, _amount represents the # of NFT.com tokens used to mint. wwhen _type = 0, _amount represents # of creator tokens to burn
     @param tokenId tokenId of the profile, links to the specific creator coin we wish to mint/burn for
    */
    function mintBurnHelper(uint256 _type, uint256 _amount, uint256 tokenId) private nonReentrant {
        address profileOwner = ownerOf(tokenId);
        uint256 feeNumerator = uint256(10000).sub(_profileOwnerFee[tokenId].add(protocolFee));
        
        uint256 _customToken;
        uint256 _creatorFee;
        uint256 _protocolFee;
        uint256 _customTotal;

        if (_type != 0) {
            _creatorFee = _amount.mul(_profileOwnerFee[tokenId]).div(10000);
            _protocolFee = _amount.mul(protocolFee).div(10000); 

            _customToken = getPrice(1, _creatorCoinMap[tokenId], _amount.mul(feeNumerator).div(10000));

            require(IERC20(nftErc20Contract).transferFrom(msg.sender, _creatorCoinMap[tokenId], _amount));
            _customTotal = 0;
        } else {
            uint256 _totalNftTokens = getPrice(0, _creatorCoinMap[tokenId], _amount);
            _customToken = _totalNftTokens.mul(feeNumerator).div(10000); // _nftCoinToReceive

            _creatorFee = _totalNftTokens.mul(_profileOwnerFee[tokenId]).div(10000);
            _protocolFee = _totalNftTokens.mul(protocolFee).div(10000);
            _customTotal = _amount;
        }

        // collect fees and mint or burn creator coin
        ICreatorCoin(_creatorCoinMap[tokenId]).performAction(
            _type,
            msg.sender,
            profileOwner,
            _creatorFee,
            _protocolFee,
            _customToken,
            _customTotal
        );
    }

    /**
     @notice client facing function to mint creator coin
     @param _amount amount of NFT.com ERC20 that is sent
     @param tokenId the ID of the NFT.com profile you want to mint for
    */
    function mintCreatorCoin(uint256 _amount, uint256 tokenId) external {
        require(_creatorCoinMap[tokenId] != address(0x0), "requires init");
        mintBurnHelper(1, _amount, tokenId);
    }

    /**
     @notice client facing function to redeem creator coin for NFT.com erc20
     @param _amount amount of creator coin that is being burned
     @param tokenId the ID of the NFT.com profile you want to mint for
    */
    function burnCreatorCoin(uint256 _amount, uint256 tokenId) external {
        mintBurnHelper(0, _amount, tokenId);
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