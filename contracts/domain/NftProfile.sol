// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfile.sol";
import "../erc721a/ERC721AProfileUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

error AddressNotFound();
error DuplicateAddress();
error NotOwner();
error InvalidAddress();

interface IRegex {
    function matches(string memory input) external pure returns (bool);
}

contract NftProfile is
    Initializable,
    ERC721AProfileUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    INftProfile
{
    using SafeMathUpgradeable for uint256;

    enum Blockchain {
        ETHEREUM,
        HEDERA,
        POLYGON,
        SOLANA,
        TEZOS,
        FLOW
    }

    struct AddressTuple {
        Blockchain cid;
        string chainAddr;
    }

    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;
    mapping(string => uint256) internal _expiryTimeline;

    address public profileAuctionContract;
    uint96 public protocolFee;
    address public owner;

    // uint8 represents the blockchain
    // tokenId => bytes (abi.encode(uint8,string))
    mapping(uint256 => bytes[]) internal _associatedAddresses;
    mapping(Blockchain => IRegex) internal _associatedRegex;

    event NewFee(uint256 _fee);
    event UpdatedRegex(Blockchain _cid, IRegex _regexAddress);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function initialize(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) public initializer {
        __ReentrancyGuard_init();
        __ERC721A_init(name, symbol, baseURI);
        __UUPSUpgradeable_init();
        protocolFee = 200; // 2% fee

        owner = msg.sender;
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

        _transferAdmin(ERC721AProfileUpgradeable.ownerOf(tokenId), _to, tokenId);
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function profileOwner(string memory _string) public view override returns (address) {
        return ownerOf(_tokenUsedURIs[_string].sub(1));
    }

    // validation helper function for different chains
    function validateAddress(Blockchain cid, string memory chainAddr) private view {
        if (!_associatedRegex[cid].matches(chainAddr)) revert InvalidAddress();
    }

    // adds multiple addresses at a time while checking for duplicates
    function addAssociatedAddresses(bytes[] calldata inputBytes, string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        uint256 l1 = inputBytes.length;
        for (uint256 i = 0; i < l1; ) {
            (Blockchain cid, string memory chainAddr) = abi.decode(inputBytes[i], (Blockchain, string));
            validateAddress(cid, chainAddr);

            uint256 l2 = _associatedAddresses[tokenId].length;
            for (uint256 j = 0; j < l2; ) {
                if (keccak256(_associatedAddresses[tokenId][j]) == keccak256(inputBytes[i])) revert DuplicateAddress();
                unchecked {
                    ++j;
                }
            }

            _associatedAddresses[tokenId].push(inputBytes[i]);

            unchecked {
                ++i;
            }
        }
    }

    // removes 1 address at a time
    function removeAssociatedAddress(bytes calldata inputBytes, string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        uint256 l1 = _associatedAddresses[tokenId].length;
        for (uint256 i = 0; i < l1; ) {
            (Blockchain cid, string memory chainAddr) = abi.decode(inputBytes, (Blockchain, string));
            validateAddress(cid, chainAddr);

            if (keccak256(_associatedAddresses[tokenId][i]) == keccak256(inputBytes)) {
                _associatedAddresses[tokenId][i] = _associatedAddresses[tokenId][l1 - 1];
                _associatedAddresses[tokenId].pop();
                break;
            }

            unchecked {
                ++i;
            }
        }

        revert AddressNotFound();
    }

    // can be used to clear mapping OR more gas efficient to remove multiple addresses
    function clearAssociatedAddresses(string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);

        _associatedAddresses[tokenId] = new bytes[](0);
    }

    function associatedAddress(string calldata profileUrl) external view returns (AddressTuple[] memory) {
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        uint256 l1 = _associatedAddresses[tokenId].length;
        AddressTuple[] memory tuples = new AddressTuple[](l1);

        for (uint256 i = 0; i < l1; ) {
            (Blockchain cid, string memory chainAddr) = abi.decode(
                _associatedAddresses[tokenId][i],
                (Blockchain, string)
            );
            tuples[i] = AddressTuple(cid, chainAddr);
            unchecked {
                ++i;
            }
        }

        return tuples;
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
     @notice returns the expiry timeline of a profile
     @param _string profile URI
     @return the unix timestamp of the expiry
    */
    function getExpiryTimeline(string memory _string) external view returns (uint256) {
        return _expiryTimeline[_string];
    }

    /**
     @notice helper function that sets the profile auction (split deployment)
     @param _profileAuctionContract address of the profile auction contract
    */
    function setProfileAuction(address _profileAuctionContract) external onlyOwner {
        profileAuctionContract = _profileAuctionContract;
    }

    function setRegex(Blockchain _cid, IRegex _regexContract) external onlyOwner {
        _associatedRegex[_cid] = _regexContract;
        emit UpdatedRegex(_cid, _regexContract);
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    function setProtocolFee(uint96 _fee) external onlyOwner {
        require(_fee <= 2000); // 20%
        protocolFee = _fee;
        emit NewFee(_fee);
    }

    /**
     @notice helper function used to mint profile, set URI, bid details
     @param _receiver the user who bought the profile
     @param _profileURI profile username
     @param _duration seconds to add to expiry
    */
    function createProfile(
        address _receiver,
        string memory _profileURI,
        uint256 _duration
    ) external override {
        require(msg.sender == profileAuctionContract);
        uint256 preSupply = totalSupply();
        _mint(_receiver, 1, "", false);
        setTokenURI(preSupply, _profileURI);
        _expiryTimeline[_profileURI] = block.timestamp + _duration;
        emit ExtendExpiry(_profileURI, _expiryTimeline[_profileURI]);
    }

    /**
     @notice helper function used to extend existing profile registration
     @param _profileURI profile username
     @param _duration seconds to add to expiry
     @param _licensee seconds to add to expiry
    */
    function extendLicense(
        string memory _profileURI,
        uint256 _duration,
        address _licensee
    ) external override {
        require(_exists(_tokenUsedURIs[_profileURI]), "!exists");
        require(msg.sender == profileAuctionContract, "only auction");
        require(ownerOf(_tokenUsedURIs[_profileURI].sub(1)) == _licensee, "!owner");

        if (_expiryTimeline[_profileURI] >= block.timestamp) {
            _expiryTimeline[_profileURI] += _duration;
        } else {
            _expiryTimeline[_profileURI] = block.timestamp + _duration;
        }
        emit ExtendExpiry(_profileURI, _expiryTimeline[_profileURI]);
    }

    function purchaseExpiredProfile(
        string memory _profileURI,
        uint256 _duration,
        address _receiver
    ) external override {
        require(msg.sender == profileAuctionContract, "only auction");
        require(_exists(_tokenUsedURIs[_profileURI]));
        require(_expiryTimeline[_profileURI] < block.timestamp, "!expired");
        uint256 tokenId = _tokenUsedURIs[_profileURI].sub(1);
        require(ownerOf(tokenId) != _receiver, "!receiver");

        _expiryTimeline[_profileURI] = block.timestamp + _duration;

        _transferAdmin(ERC721AProfileUpgradeable.ownerOf(tokenId), _receiver, tokenId);

        emit ExtendExpiry(_profileURI, _expiryTimeline[_profileURI]);
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
