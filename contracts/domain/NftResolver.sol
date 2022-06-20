// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfile.sol";
import "../interface/INftResolver.sol";
import "./library/Resolver.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NftResolver is
    Initializable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    INftResolver
{
    using SafeMathUpgradeable for uint256;

    INftProfile nftProfile;
    address public owner;

    // ===================================================================================================
    mapping(string => uint256) internal _nonce; // profile nonce for easy clearing of maps
    mapping(Blockchain => IRegex) internal _regexMap; // mapping of chain -> regex contract
    // Storage for owner of profile ======================================================================
    mapping(address => mapping(uint256 => AddressTuple[])) internal _ownerAddrList;
    mapping(address => mapping(uint256 => AddressTuple)) internal _ownerCtx;
    mapping(uint256 => mapping(bytes => bool)) internal _ownerNonEvmMap;   // O(1) lookup non-evm
    mapping(uint256 => mapping(address => bool)) internal _ownerEvmMap;    // O(1) lookup evm
    // ===================================================================================================
    mapping(address => RelatedProfiles[]) internal _approvedEvmList;
    mapping(bytes => bool) internal _approvedMap;
    // ===================================================================================================

    event UpdatedRegex(Blockchain _cid, IRegex _regexAddress);

    function _onlyOwner() private view {
        require(msg.sender == owner);
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function initialize(
        INftProfile _nftProfile
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        owner = msg.sender;
        nftProfile = _nftProfile;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // validation helper function for different chains
    function validateAddress(Blockchain cid, string memory chainAddr) private view {
        if (address(_regexMap[cid]) == 0x0000000000000000000000000000000000000000) revert InvalidRegex();
        if (!_regexMap[cid].matches(chainAddr)) revert InvalidAddress();
    }

    function setAssociatedContract(
        AddressTuple memory inputTuple,
        string calldata profileUrl
    ) external {
        if (nftProfile.profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = nftProfile.getTokenId(profileUrl);

        validateAddress(inputTuple.cid, inputTuple.chainAddr);

        _ownerCtx[msg.sender][tokenId] = inputTuple;
    }

    function clearAssociatedContract(string calldata profileUrl) external {
        if (nftProfile.profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = nftProfile.getTokenId(profileUrl);

        AddressTuple memory addressTuple;
        _ownerCtx[msg.sender][tokenId] = addressTuple;
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
        if (nftProfile.profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = nftProfile.getTokenId(profileUrl);
        uint256 l1 = inputTuples.length;
        uint256 nonce = _nonce[profileUrl];

        for (uint256 i = 0; i < l1; ) {
            validateAddress(inputTuples[i].cid, inputTuples[i].chainAddr);

            if (
                _ownerNonEvmMap[nonce][abi.encode(
                    msg.sender, tokenId, inputTuples[i].cid, inputTuples[i].chainAddr
                )]
            ) revert DuplicateAddress();

            if (_evmBased(inputTuples[i].cid)) {
                address parsed = Resolver._parseAddr(inputTuples[i].chainAddr);
                if (_ownerEvmMap[nonce][parsed]) revert DuplicateAddress();
                _ownerEvmMap[nonce][parsed] = true;
            } else {
                _ownerNonEvmMap[nonce][abi.encode(
                    msg.sender, tokenId, inputTuples[i].cid, inputTuples[i].chainAddr
                )] = true;
            }

            _ownerAddrList[msg.sender][tokenId].push(inputTuples[i]);
            
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
            address pOwner = nftProfile.profileOwner(url);
            uint256 tokenId = nftProfile.getTokenId(url);

            // CHECKS
            if (pOwner == msg.sender) revert InvalidSelf();
            if (_approvedMap[abi.encode(pOwner, tokenId, msg.sender)] == true) {
                revert DuplicateAddress();
            }

            // EFFECTS
            // easy access for associator to see their profiles
            _approvedEvmList[msg.sender].push(RelatedProfiles({ addr: pOwner, profileUrl: url }));
            // mapping for O(1) lookup
            _approvedMap[abi.encode(pOwner, tokenId, msg.sender)] = true;

            // INTERACTIONS

            unchecked {
                ++i;
            }
        }
    }

    // removes 1 address at a time
    function removeAssociatedAddress(AddressTuple calldata inputTuple, string calldata profileUrl) external {
        if (nftProfile.profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = nftProfile.getTokenId(profileUrl);
        uint256 l1 = _ownerAddrList[msg.sender][tokenId].length;
        uint256 nonce = _nonce[profileUrl];

        for (uint256 i = 0; i < l1; ) {
            validateAddress(inputTuple.cid, inputTuple.chainAddr);

            // EVM based - checksum
            if (_evmBased(inputTuple.cid)) {
                address parsed = Resolver._parseAddr(inputTuple.chainAddr);
                if (_ownerEvmMap[nonce][parsed]) {
                    _ownerAddrList[msg.sender][tokenId][i] = _ownerAddrList[msg.sender][tokenId][l1 - 1];
                    _ownerAddrList[msg.sender][tokenId].pop();
                    _ownerEvmMap[nonce][parsed] = false;
                    break;
                }
            } else if (
                // non-evm
                _sameHash(inputTuple, _ownerAddrList[msg.sender][tokenId][i])
            ) {
                _ownerAddrList[msg.sender][tokenId][i] = _ownerAddrList[msg.sender][tokenId][l1 - 1];
                _ownerAddrList[msg.sender][tokenId].pop();

                _ownerNonEvmMap[nonce][abi.encode(
                    msg.sender, tokenId, inputTuple.cid, inputTuple.chainAddr
                )] = false;
                
                break;
            }

            unchecked {
                ++i;
            }
        }

        revert AddressNotFound();
    }

    // can be used to clear mapping OR more gas efficient to remove multiple addresses
    // nonce increment clears the mapping without having to manually reset state
    function clearAssociatedAddresses(string calldata profileUrl) external {
        if (nftProfile.profileOwner(profileUrl) != msg.sender) revert NotOwner();
        uint256 tokenId = nftProfile.getTokenId(profileUrl);
        delete _ownerAddrList[msg.sender][tokenId];

        unchecked {
            ++_nonce[profileUrl];
        }
    }

    function evmBased(Blockchain cid) external pure returns (bool) {
        return _evmBased(cid);
    }

    function parseAddr(string memory _a) external pure returns (address) {
        return Resolver._parseAddr(_a);
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
                if (_approvedMap[abi.encode(pOwner, tokenId, Resolver._parseAddr(rawAssc[i].chainAddr))]) {
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
        uint256 tokenId = nftProfile.getTokenId(profileUrl);
        address pOwner = nftProfile.profileOwner(profileUrl);
        AddressTuple[] memory rawAssc = _ownerAddrList[pOwner][tokenId];
        AddressTuple[] memory updatedAssc = new AddressTuple[](validAddressSize(
            tokenId,
            pOwner,
            rawAssc
        ));

        for (uint256 i = 0; i < rawAssc.length; ) {
            if (_evmBased(rawAssc[i].cid)) {
                // if approved
                if (_approvedMap[abi.encode(pOwner, tokenId, Resolver._parseAddr(rawAssc[i].chainAddr))]) {
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

    function setRegex(Blockchain _cid, IRegex _regexContract) external onlyOwner {
        _regexMap[_cid] = _regexContract;
        emit UpdatedRegex(_cid, _regexContract);
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }
}