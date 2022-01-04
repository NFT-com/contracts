// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfileHelper.sol";
import "../interface/INftProfile.sol";
import "../interface/IGenesisKeyStake.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

interface INftToken {
    function burn(uint256 _amount) external;
}

contract ProfileAuctionV1 is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeMathUpgradeable for uint256;

    mapping(bytes32 => bool) public cancelledOrFinalized; // Cancelled / finalized bid, by hash
    mapping(bytes32 => uint256) public claimableBlock; // Claimable bid (0 = not claimable, > 0 = claimable), by hash
    mapping(bytes32 => bool) public approvedBids; // Bids verified by on-chain approval (optional)

    address public governor;
    address public minter;
    address public owner;
    address public nftErc20Contract;
    address public nftProfile;
    address public genesisStakingContract;
    address public publicStakingContract;
    address public nftProfileHelperAddress;
    address public coldWallet;
    address public genesisKeyContract;

    // fees, whatever is left goes to coldWallet (for ops)
    // e.g. genesisKeyPercent = 8000 (80%), publicPoolPercent = 1800 (18%), remaining 2% => coldWallet
    uint256 public genesisKeyPercent; // 10000 = 100%
    uint256 public publicPoolPercent; // 10000 = 100%
    uint256 public minimumBid; // Minimum bid for any profile

    event NewBid(address _user, bool _genKey, string _val, uint256 _amount);
    event BidCancelled(bytes32 indexed hash);
    event NewClaimableProfile(address _user, bool _genKey, string _val, uint256 _amount, uint256 _blockNum);
    event MintedProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);
    event RedeemProfile(address _user, string _val, uint256 _block, uint256 _amount, uint256 _tokenId);

    /* An ECDSA signature. */
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

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
        address _nftErc20Contract,
        address _minter,
        address _nftProfile,
        address _governor,
        address _nftProfileHelperAddress,
        address _coldWallet,
        address _genesisKeyContract,
        address _genesisStakingContract,
        address _publicStakingContract
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        nftErc20Contract = _nftErc20Contract;
        nftProfile = _nftProfile;
        nftProfileHelperAddress = _nftProfileHelperAddress;
        coldWallet = _coldWallet;

        owner = msg.sender;
        governor = _governor;
        minter = _minter;
        genesisKeyContract = _genesisKeyContract;
        genesisKeyPercent = 8000;
        publicPoolPercent = 1800;
        minimumBid = 10000 * 10**18; // 10,000 NFT tokens
        genesisStakingContract = _genesisStakingContract;
        publicStakingContract = _publicStakingContract;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice helper function transfer NFT tokens to reduce contract size
     @param _user user transferring tokens
     @param _amount number of NFT tokens being transferred
    */
    function transferNftTokens(address _user, uint256 _amount) private returns (bool) {
        require(_amount != 0);
        return IERC20Upgradeable(nftErc20Contract).transferFrom(_user, address(this), _amount);
    }

    // single external function to group transactions together (gas saving)
    function payOutNftTokens() external {
        uint256 nftBalance = IERC20Upgradeable(nftErc20Contract).balanceOf(address(this));

        require(nftBalance != 0, "NFT.com: !TOKENS");

        IERC20Upgradeable(nftErc20Contract).transfer(
            genesisStakingContract,
            nftBalance.mul(genesisKeyPercent).div(10000)
        );
        IERC20Upgradeable(nftErc20Contract).transfer(
            publicStakingContract,
            nftBalance.mul(publicPoolPercent).div(10000)
        );
        IERC20Upgradeable(nftErc20Contract).transfer(
            coldWallet,
            nftBalance.mul(uint256(10000).sub(genesisKeyPercent.add(publicPoolPercent)).div(10000))
        );
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

    function validURI(string memory _name) private view returns (bool) {
        return INftProfileHelper(nftProfileHelperAddress)._validURI(_name);
    }

    /**
     * @dev Assert a bid is valid and return its hash
     * @param _nftTokens nft tokens for bid
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function requireValidBid_(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        Sig memory sig
    ) internal view returns (bytes32) {
        bytes32 hash = getStructHash(_nftTokens, _genKey, _profileURI, _owner);
        require(genKeyOwner_(_owner) == _genKey, "NFT.com: !GEN_KEY");

        require(validateBid_(hash, _nftTokens, _owner, sig), "NFT.com: INVALID SIG");
        return hash;
    }

    /**
     * @dev Cancel an bid, preventing it from being matched. Must be called by the maker of the bid
     * @param _nftTokens nft tokens for bid
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function cancelBid_(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        Sig memory sig
    ) internal {
        /* CHECKS */

        /* Calculate bid hash. */
        bytes32 hash = requireValidBid_(_nftTokens, _genKey, _profileURI, _owner, sig);

        require(msg.sender == _owner); // must be owner
        require(claimableBlock[hash] == 0); // must not be claimable

        /* EFFECTS */

        /* Mark bid as cancelled, preventing it from being matched. */
        cancelledOrFinalized[hash] = true;

        /* Log cancel event. */
        emit BidCancelled(hash);
    }

    /**
     * @dev Approve an bid. Must be called by the _owner of the bid
     * @param _nftTokens nft tokens for bid
     * @param _genKey whether bid was created by a gen key holder
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     */
    function approveBid_(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner
    ) internal validAndUnusedURI(_profileURI) {
        // checks
        require(msg.sender == _owner);
        bytes32 hash = getStructHash(_nftTokens, _genKey, _profileURI, _owner);
        require(!approvedBids[hash]); // Assert bid has not already been approved.

        // effects
        approvedBids[hash] = true; // Mark bid as approved.

        emit NewBid(_owner, _genKey, _profileURI, _nftTokens);
    }

    /**
     * @dev Validate a provided previously approved / signed bid, hash, and signature.
     * @param hash Bid hash (already calculated, passed to avoid recalculation)
     * @param _nftTokens nft tokens for bid
     * @param _owner user who is making bid
     * @param sig ECDSA signature
     */
    function validateBid_(
        bytes32 hash,
        uint256 _nftTokens,
        address _owner,
        Sig memory sig
    ) internal view returns (bool) {
        /* Bid must have valid token amount. */
        if (_nftTokens == 0) {
            return false;
        }

        /* Bid must have not been canceled or already filled. */
        if (cancelledOrFinalized[hash]) {
            return false;
        }

        /* Bid authentication. Bid must be either:
        /* (a) previously approved */
        if (approvedBids[hash]) {
            return true;
        }

        /* or (b) ECDSA-signed by owner. */
        bytes32 hashV4 = _hashTypedDataV4ProfileAuction(hash);

        if (ECDSAUpgradeable.recover(hashV4, sig.v, sig.r, sig.s) == _owner) {
            return true;
        }

        return false;
    }

    /* EXTERNAL FUNCTIONS */
    function validateBid(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external view returns (bool) {
        bytes32 hash = getStructHash(_nftTokens, _genKey, _profileURI, _owner);

        return validateBid_(hash, _nftTokens, _owner, Sig(v, r, s));
    }

    function _domainSeparatorV4ProfileAuction() internal view returns (bytes32) {
        bytes32 _TYPE_HASH = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

        return
            keccak256(
                abi.encode(
                    _TYPE_HASH,
                    keccak256("NFT.com Domain Auction"),
                    keccak256("1"),
                    block.chainid,
                    address(this)
                )
            );
    }

    function _hashTypedDataV4ProfileAuction(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSAUpgradeable.toTypedDataHash(_domainSeparatorV4ProfileAuction(), structHash);
    }

    // primarily used to query
    function getStructHash(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner
    ) public pure returns (bytes32) {
        bytes32 _PERMIT_TYPEHASH = keccak256("Bid(uint256 _nftTokens,bool _genKey,string _profileURI,address _owner)");

        return keccak256(abi.encode(_PERMIT_TYPEHASH, _nftTokens, _genKey, _profileURI, _owner));
    }

    function approveBid(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner
    ) external {
        return approveBid_(_nftTokens, _genKey, _profileURI, _owner);
    }

    function cancelBid(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        return cancelBid_(_nftTokens, _genKey, _profileURI, _owner, Sig(v, r, s));
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }

    function setMinimumBid(uint256 _newBid) external onlyGovernor {
        minimumBid = _newBid;
    }

    // private function used to determine if _user is a genesis key holder or has staked their key
    function genKeyOwner_(address _user) private view returns (bool) {
        return
            IERC721Upgradeable(genesisKeyContract).balanceOf(_user) != 0 ||
            IGenesisKeyStake(genesisKeyContract).stakedAddress(_user) != 0;
    }

    /**
     @notice centralized mint function for auction profiles, restricted to minter and approved bids
     * @param _nftTokens nft tokens for bid
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     * @param v sig for bid
     * @param r sig for bid
     * @param s sig for bid
     * @param nftV sig for nftToken approval (optional / only required on when allowance = 0)
     * @param nftR sig for nftToken approval (optional / only required on when allowance = 0)
     * @param nftS sig for nftToken approval (optional / only required on when allowance = 0)

    */
    function mintProfileFor(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint8 nftV,
        bytes32 nftR,
        bytes32 nftS
    ) external nonReentrant validAndUnusedURI(_profileURI) {
        // checks
        require(msg.sender == minter, "NFT.com: UNAUTHORIZED");
        bytes32 hash = requireValidBid_(_nftTokens, _genKey, _profileURI, _owner, Sig(v, r, s));
        require(_nftTokens >= minimumBid, "NFT.com: bid < minimumBid");
        require(!cancelledOrFinalized[hash]);
        require(claimableBlock[hash] == 0);
        require(genKeyOwner_(_owner) == _genKey, "NFT.com: !GEN_KEY");

        // effects
        claimableBlock[hash] = block.number;

        // interactions
        // only apply approve permit for first time
        if (IERC20Upgradeable(nftErc20Contract).allowance(_owner, address(this)) == 0) {
            permitNFT(_owner, address(this), nftV, nftR, nftS); // approve NFT token
        }

        require(transferNftTokens(_owner, _nftTokens)); // transfer NFT token

        emit NewClaimableProfile(_owner, _genKey, _profileURI, _nftTokens, block.number);
    }

    /**
     @notice allows winning profiles (from mintProfileFor) to claim the profile and mint
    */
    function claimProfile(
        uint256 _nftTokens,
        bool _genKey,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // checks
        require(msg.sender == _owner);
        bytes32 hash = requireValidBid_(_nftTokens, _genKey, _profileURI, _owner, Sig(v, r, s));
        require(!cancelledOrFinalized[hash]);
        require(claimableBlock[hash] != 0);
        require(genKeyOwner_(_owner) == _genKey, "NFT.com: !GEN_KEY");

        // effects
        cancelledOrFinalized[hash] = true;

        // interactions
        INftProfile(nftProfile).createProfile(_owner, _nftTokens, _profileURI, claimableBlock[hash]);

        emit MintedProfile(_owner, _profileURI, _nftTokens, claimableBlock[hash]);
    }
}
