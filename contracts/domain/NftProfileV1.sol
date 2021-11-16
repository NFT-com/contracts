// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/ICreatorCoin.sol";
import "../interface/ICreatorBondingCurve.sol";
import "./creatorCoin/CreatorCoin.sol";
import "../interface/INftProfile.sol";
import "../oz_modified/ERC721EnumerableUpgradeable.sol";
import "../royalties/IERC2981Royalties.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

struct CreatorCoinParam {
    address profileOwner;
    uint256 feeNumerator;
    uint256 _customToken;
    uint256 _creatorFee;
    uint256 _protocolFee;
    uint256 _customTotal;
}

contract NftProfileV1 is
    Initializable,
    ERC721EnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    INftProfile,
    IERC2981Royalties
{
    using SafeMath for uint256;

    struct RoyaltyInfo {
        address recipient;
        uint24 amount;
    }

    RoyaltyInfo private _royalties;
    mapping(uint256 => uint256) internal _profileOwnerFee;
    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;
    mapping(uint256 => address) internal _creatorCoinMap;
    mapping(uint256 => Bid) internal _profileDetails;

    uint256 public protocolFee;
    address public profileAuctionContract;
    address public _bondingCurveContract;
    address public nftErc20Contract;
    address public owner;

    modifier onlyOwner() {
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
        protocolFee = 200; // 2% fee

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
        require(_tokenUsedURIs[_tokenURI] == 0);

        _tokenURIs[_tokenId] = _tokenURI;

        // adds 1 to preserve 0 being the default not found case
        _tokenUsedURIs[_tokenURI] = _tokenId.add(1);
    }

    /**
     @dev Sets token royalties
     @param recipient recipient of the royalties
     @param value percentage (using 2 decimals - 10000 = 100, 0 = 0)
    */
    function _setRoyalties(address recipient, uint256 value) internal {
        require(value <= 10000, "NFT.COM: ERC-2981 Royalty Too High");
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
     @notice helper function to initialize a creator coin for a given NFT profile
     @param _tokenId the ID of the NFT.com profile,
     @param _nftTokens optional parameter of the number of NFT tokens passed to mint
    */
    function initializeCreatorCoin(
        uint256 _tokenId,
        uint256 _nftTokens,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(_exists(_tokenId) && _creatorCoinMap[_tokenId] == address(0x0));

        CreatorCoin creatorCoinContract = new CreatorCoin(
            address(this),
            nftErc20Contract,
            _tokenURIs[_tokenId],
            string(abi.encodePacked("@", _tokenURIs[_tokenId]))
        );

        _profileOwnerFee[_tokenId] = 1000; // default fee is 10%
        _creatorCoinMap[_tokenId] = address(creatorCoinContract);

        // this allows a user to mint immedietly after initializing the contract
        // prevents flashbots from front running mints
        if (_nftTokens != 0) mintBurnHelper(msg.sender, 1, _nftTokens, _tokenId, v, r, s);
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

    /**
     @notice helper function that sets the bonding curve
     @param _curve address of the new bonding curve
    */
    function changeBondingCurve(address _curve) external onlyOwner {
        _bondingCurveContract = _curve;
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
    ) external override {
        require(msg.sender == profileAuctionContract);
        uint256 preSupply = totalSupply();

        _mint(_receiver, preSupply);
        setTokenURI(preSupply, _profileURI);
        _profileDetails[preSupply] = Bid(_nftTokens, _blockMinted, _profileURI, _blockWait);
    }

    /**
     @notice modifies a NFT profile's fee on their creator token
     @param _rate value from 0 - 2000, represented in basis points (BP), 2000 = 20%
     @param tokenId the ID of the NFT.com profile
    */
    function modifyProfileRate(uint256 _rate, uint256 tokenId) external {
        require(msg.sender == ownerOf(tokenId), "!owner");
        require(_rate >= 0 && _rate <= 2000, "!bounds");
        _profileOwnerFee[tokenId] = _rate;
    }

    /**
     @notice returns a NFT profile's fee on their creator token
     @param tokenId the ID of the NFT.com profile
     @return value from 0 - 2000, represented in basis points (BP)
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
    function getPrice(
        uint256 _type,
        address _creatorCoin,
        uint256 _amount
    ) private view returns (uint256) {
        return ICreatorBondingCurve(_bondingCurveContract).getPrice(_type, _creatorCoin, _amount);
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
     @notice helper function to reduce contract size by combining call logic, assists with minting and burning
     @param _type 1 = mint, 0 = burn
     @param _amount when _type = 1, _amount represents the # of NFT.com tokens used to mint. wwhen _type = 0, _amount represents # of creator tokens to burn
     @param tokenId tokenId of the profile, links to the specific creator coin we wish to mint/burn for
    */
    function mintBurnHelper(
        address _caller,
        uint256 _type,
        uint256 _amount,
        uint256 tokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private nonReentrant {
        require(_exists(tokenId), "!exists");

        CreatorCoinParam memory c = CreatorCoinParam(
            ownerOf(tokenId),
            uint256(10000).sub(_profileOwnerFee[tokenId].add(protocolFee)),
            0,
            0,
            0,
            0
        );

        if (_type != 0) {
            c._creatorFee = _amount.mul(_profileOwnerFee[tokenId]).div(10000);
            c._protocolFee = _amount.mul(protocolFee).div(10000);

            c._customToken = getPrice(1, _creatorCoinMap[tokenId], _amount.mul(c.feeNumerator).div(10000));

            if (IERC20Upgradeable(nftErc20Contract).allowance(_caller, address(this)) == 0) {
                permitNFT(_caller, address(this), v, r, s); // approve NFT token
            }

            require(IERC20(nftErc20Contract).transferFrom(msg.sender, _creatorCoinMap[tokenId], _amount));

            c._customTotal = 0;
        } else {
            uint256 _totalNftTokens = getPrice(0, _creatorCoinMap[tokenId], _amount);
            c._customToken = _totalNftTokens.mul(c.feeNumerator).div(10000); // _nftCoinToReceive

            c._creatorFee = _totalNftTokens.mul(_profileOwnerFee[tokenId]).div(10000);
            c._protocolFee = _totalNftTokens.mul(protocolFee).div(10000);
            c._customTotal = _amount;
        }

        // collect fees and mint or burn creator coin
        ICreatorCoin(_creatorCoinMap[tokenId]).performAction(
            _type,
            msg.sender,
            c.profileOwner,
            c._creatorFee,
            c._protocolFee,
            c._customToken,
            c._customTotal
        );
    }

    /**
     @notice client facing function to mint creator coin
     @param _amount amount of NFT.com ERC20 that is sent
     @param tokenId the ID of the NFT.com profile you want to mint for
    */
    function mintCreatorCoin(
        uint256 _amount,
        uint256 tokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(_creatorCoinMap[tokenId] != address(0x0), "requires init");
        mintBurnHelper(msg.sender, 1, _amount, tokenId, v, r, s);
    }

    /**
     @notice client facing function to redeem creator coin for NFT.com erc20
     @param _amount amount of creator coin that is being burned
     @param tokenId the ID of the NFT.com profile you want to burn from
    */
    function burnCreatorCoin(
        uint256 _amount,
        uint256 tokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        mintBurnHelper(msg.sender, 0, _amount, tokenId, v, r, s);
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
