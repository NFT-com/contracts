// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfile.sol";
import "../erc721a/ERC721AProfileUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

error AddressNotFound();
error DuplicateAddress();
error DuplicateEvmAddress();
error NotOwner();
error InvalidAddress();
error InvalidAuth();
error InvalidRegex();
error InvalidSelf();

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
    using ECDSAUpgradeable for bytes32;

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

    // used for historical tracking and easy on-chain access for associations for verifier
    struct RelatedProfiles {
        address addr;
        string profileUrl;
    }

    mapping(uint256 => string) internal _tokenURIs;
    mapping(string => uint256) internal _tokenUsedURIs;
    mapping(string => uint256) internal _expiryTimeline;

    address public profileAuctionContract;
    uint96 public protocolFee;
    address public owner;

    mapping(address => mapping(uint256 => AddressTuple[])) internal _associatedAddresses;
    mapping(address => mapping(uint256 => AddressTuple)) internal _associatedContract;
    // used for verification of ownership
    mapping(address => mapping(uint256 => address[])) internal _approvedEvmAddresses;
    // easy access for users to see what they are currently associated with
    mapping(address => RelatedProfiles[]) internal _selfApprovedEvmList;
    mapping(bytes => bool) internal _associatedMap;
    mapping(bytes => bool) internal _selfApprovedMap;
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

    function profileOwner(string memory _string) public view override returns (address) {
        return ownerOf(_tokenUsedURIs[_string].sub(1));
    }

    // validation helper function for different chains
    function validateAddress(Blockchain cid, string memory chainAddr) private view {
        if (address(_associatedRegex[cid]) == 0x0000000000000000000000000000000000000000) revert InvalidRegex();
        if (!_associatedRegex[cid].matches(chainAddr)) revert InvalidAddress();
    }

    function verifySignature(
        bytes32 hash,
        bytes memory signature,
        address owner
    ) public pure returns (bool) {
        return owner == hash.recover(signature);
    }

    function hashTransaction(
        address signer,
        string memory profileUrl,
        uint256 timestamp
    ) private pure returns (bytes32) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(signer, profileUrl, timestamp))
            )
        );

        return hash;
    }

    // TODO: add signature verification
    function setAssociatedContract(
        AddressTuple memory inputTuple,
        string calldata profileUrl,
        bytes32 hash,
        bytes memory signature
    ) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);

        validateAddress(inputTuple.cid, inputTuple.chainAddr);

        if (!verifySignature(hash, signature, msg.sender)) revert InvalidAuth();
        // if (!hashTransaction() != hash) revert InvalidAuth();

        _associatedContract[msg.sender][tokenId] = inputTuple;
    }

    function clearAssociatedContract(string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);

        AddressTuple memory addressTuple;
        _associatedContract[msg.sender][tokenId] = addressTuple;
    }

    // _s1 and _s2 are addresses stored in the form of strings
    function _sameChecksum(string memory _s1, string memory _s2) private pure returns (bool) {
        return _parseAddr(_s1) == _parseAddr(_s2);
    }

    function _sameHash(AddressTuple memory _t1, AddressTuple memory _t2) private pure returns (bool) {
        return keccak256(abi.encode(_t1.cid, _t1.chainAddr)) == keccak256(abi.encode(_t2.cid, _t2.chainAddr));
    }

    function _evmBased(Blockchain cid) private pure returns (bool) {
        if (cid == Blockchain.ETHEREUM || cid == Blockchain.POLYGON) return true;
        return false;
    }

    // adds multiple addresses at a time while checking for duplicates
    function addAssociatedAddresses(AddressTuple[] calldata inputTuples, string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        uint256 l1 = inputTuples.length;
        for (uint256 i = 0; i < l1; ) {
            validateAddress(inputTuples[i].cid, inputTuples[i].chainAddr);

            if (_associatedMap[abi.encode(msg.sender, tokenId, inputTuples[i].cid, inputTuples[i].chainAddr)])
                revert DuplicateAddress();

            uint256 l2 = _associatedAddresses[msg.sender][tokenId].length;
            for (uint256 j = 0; j < l2; ) {
                if (_evmBased(inputTuples[i].cid)) {
                    if (
                        _sameChecksum(inputTuples[i].chainAddr, _associatedAddresses[msg.sender][tokenId][j].chainAddr)
                    ) {
                        revert DuplicateEvmAddress();
                    }
                }

                unchecked {
                    ++j;
                }
            }

            _associatedAddresses[msg.sender][tokenId].push(inputTuples[i]);
            _associatedMap[abi.encode(msg.sender, tokenId, inputTuples[i].cid, inputTuples[i].chainAddr)] = true;

            unchecked {
                ++i;
            }
        }
    }

    // allows for bidirectional association
    function associateSelfWithUsers(string[] calldata urls) external {
        uint256 l1 = urls.length;

        for (uint256 i = 0; i < l1; ) {
            string memory url = urls[i];
            address pOwner = profileOwner(url);
            uint256 tokenId = _tokenUsedURIs[url].sub(1);

            // CHECKS
            if (pOwner == msg.sender) revert InvalidSelf();
            if (_selfApprovedMap[abi.encode(pOwner, tokenId, msg.sender)] == true) {
                revert DuplicateAddress();
            }

            // EFFECTS
            // easy access for associator to see their profiles
            _selfApprovedEvmList[msg.sender].push(RelatedProfiles({ addr: pOwner, profileUrl: url }));
            // mapping for O(1) lookup
            _selfApprovedMap[abi.encode(pOwner, tokenId, msg.sender)] = true;

            // INTERACTIONS

            unchecked {
                ++i;
            }
        }
    }

    // removes 1 address at a time
    function removeAssociatedAddress(AddressTuple calldata inputTuple, string calldata profileUrl) external {
        if (profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        uint256 l1 = _associatedAddresses[msg.sender][tokenId].length;

        for (uint256 i = 0; i < l1; ) {
            validateAddress(inputTuple.cid, inputTuple.chainAddr);

            // EVM based - checksum
            if (_evmBased(inputTuple.cid)) {
                if (_sameChecksum(_associatedAddresses[msg.sender][tokenId][i].chainAddr, inputTuple.chainAddr)) {
                    _associatedAddresses[msg.sender][tokenId][i] = _associatedAddresses[msg.sender][tokenId][l1 - 1];
                    _associatedAddresses[msg.sender][tokenId].pop();
                    break;
                }
            } else if (
                // non-evm
                _sameHash(inputTuple, _associatedAddresses[msg.sender][tokenId][i])
            ) {
                _associatedAddresses[msg.sender][tokenId][i] = _associatedAddresses[msg.sender][tokenId][l1 - 1];
                _associatedAddresses[msg.sender][tokenId].pop();
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
        delete _associatedAddresses[msg.sender][tokenId];
    }

    function evmBased(Blockchain cid) external pure returns (bool) {
        return _evmBased(cid);
    }

    function parseAddr(string memory _a) external pure returns (address) {
        return _parseAddr(_a);
    }

    function _parseAddr(string memory _a) private pure returns (address) {
        bytes memory tmp = bytes(_a);
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint256 i = 2; i < 2 + 2 * 20; i += 2) {
            iaddr *= 256;
            b1 = uint160(uint8(tmp[i]));
            b2 = uint160(uint8(tmp[i + 1]));
            if ((b1 >= 97) && (b1 <= 102)) {
                b1 -= 87;
            } else if ((b1 >= 65) && (b1 <= 70)) {
                b1 -= 55;
            } else if ((b1 >= 48) && (b1 <= 57)) {
                b1 -= 48;
            }
            if ((b2 >= 97) && (b2 <= 102)) {
                b2 -= 87;
            } else if ((b2 >= 65) && (b2 <= 70)) {
                b2 -= 55;
            } else if ((b2 >= 48) && (b2 <= 57)) {
                b2 -= 48;
            }
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }

    function validAddressSize(
        uint256 tokenId,
        address pOwner,
        AddressTuple[] memory rawAssc
    ) private view returns (uint256) {
        uint256 size = 0;

        for (uint256 i = 0; i < rawAssc.length; ) {
            if (_evmBased(rawAssc[i].cid)) {
                // if approved
                if (_selfApprovedMap[abi.encode(pOwner, tokenId, _parseAddr(rawAssc[i].chainAddr))]) {
                    unchecked {       
                        ++size;
                    }
                }
            } else {
                unchecked {       
                    ++size;
                }
            }

            unchecked {
                ++i;
            }
        }

        return size;
    }

    // makes sure ownerAddr + profileUrl + associated address is in mapping to allow association
    function associatedAddresses(string calldata profileUrl) external view returns (AddressTuple[] memory) {
        uint256 tokenId = _tokenUsedURIs[profileUrl].sub(1);
        address pOwner = profileOwner(profileUrl);
        AddressTuple[] memory rawAssc = _associatedAddresses[pOwner][tokenId];
        AddressTuple[] memory updatedAssc = new AddressTuple[](validAddressSize(
            tokenId,
            pOwner,
            rawAssc
        ));

        for (uint256 i = 0; i < rawAssc.length; ) {
            if (_evmBased(rawAssc[i].cid)) {
                // if approved
                if (_selfApprovedMap[abi.encode(pOwner, tokenId, _parseAddr(rawAssc[i].chainAddr))]) {
                    updatedAssc[i] = rawAssc[i];
                }
            } else {
                updatedAssc[i] = rawAssc[i];
            }

            unchecked {
                ++i;
            }
        }

        return updatedAssc;
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
