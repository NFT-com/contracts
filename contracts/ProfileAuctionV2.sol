// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./interface/INftProfileHelper.sol";
import "./interface/INftProfile.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

interface INftToken {
    function burn(uint256 _amount) external;
}

contract ProfileAuctionV2 is Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable   
{
    using SafeMathUpgradeable for uint256;

    mapping(bytes32 => bool) public cancelledOrFinalized;   // Cancelled / finalized bid, by hash
    mapping(bytes32 => uint256) public claimableBlock;      // Claimable bid (0 = not claimable, > 0 = claimable), by hash
    mapping(bytes32 => bool) public approvedBids;           // Bids verified by on-chain approval (optional)

    address public governor;
    address public minter;
    address public owner;
    address public nftErc20Contract;
    address public nftProfile;
    uint256 public profileFee;
    uint256 public blockWait;
    address public nftProfileHelperAddress;
    address public coldWallet;

    event NewBid(address _user, string _val, uint256 _amount);
    event BidCancelled(bytes32 indexed hash);
    event NewClaimableProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);
    event MintedProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);
    event RedeemProfile(address _user, string _val, uint256 _block, uint256 _amount, uint256 _tokenId);
    
    /* An ECDSA signature. */ 
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    modifier validAndUnusedURI (string memory _profileURI) {
        require(validURI(_profileURI));
        require(!INftProfile(nftProfile).tokenUsed(_profileURI));
        _;
    }

    modifier onlyGovernor () {
        require(msg.sender == governor);
        _;
    }

    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    function initialize(
        address _nftErc20Contract,
        address _minter,
        address _nftProfile,
        address _governor,
        address _nftProfileHelperAddress,
        address _coldWallet
    ) public initializer {
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        nftErc20Contract = _nftErc20Contract;
        nftProfile = _nftProfile;
        blockWait = 1228540;
        profileFee = 10 ** 17; // 0.1 ETH
        nftProfileHelperAddress = _nftProfileHelperAddress;
        coldWallet = _coldWallet;

        owner = msg.sender;
        governor = _governor;
        minter = _minter;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice helper function transfer NFT tokens to reduce contract size
     @param _user user transferring tokens
     @param _amount number of NFT tokens being transferred
    */
    function transferNftTokens(address _user, uint256 _amount) private returns (bool) {
        require(_amount != 0);
        return IERC20Upgradeable(nftErc20Contract).transferFrom(
                _user,
                address(this),
                _amount
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
        return IERC20PermitUpgradeable(nftErc20Contract).permit(
            _owner,
            spender,
            2**256 - 1,
            2**256 - 1,
            v,
            r,
            s
        );
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
        string memory _profileURI,
        address _owner,
        Sig memory sig
    )
        internal
        view
        returns (bytes32)
    {
        bytes32 hash = getStructHash(_nftTokens, _profileURI, _owner);
        require(validateBid_(hash, _nftTokens, _owner, sig));
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
        string memory _profileURI,
        address _owner,
        Sig memory sig
    ) 
        internal
    {
        /* CHECKS */

        /* Calculate bid hash. */
        bytes32 hash = requireValidBid_(_nftTokens, _profileURI, _owner, sig);

        require(msg.sender == _owner);  // must be owner
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
     * @param _profileURI uri to bid for
     * @param _owner user who is making bid
     */
    function approveBid_(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner
    )
        internal
        validAndUnusedURI(_profileURI)
    {
        // checks
        require(msg.sender == _owner);
        bytes32 hash = getStructHash(_nftTokens, _profileURI, _owner);
        require(!approvedBids[hash]); // Assert bid has not already been approved.

        // effects
        approvedBids[hash] = true; // Mark bid as approved.

        emit NewBid(_owner, _profileURI, _nftTokens);
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
    )
        internal
        view
        returns (bool)
    {
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
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s)
        view
        external
        returns (bool)
    {
        bytes32 hash = getStructHash(_nftTokens, _profileURI, _owner);

        return validateBid_(
          hash,
          _nftTokens,
          _owner,
          Sig(v, r, s)
        );
    }

    function _domainSeparatorV4ProfileAuction() internal view returns (bytes32) {
        bytes32 _TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        return keccak256(abi.encode(
            _TYPE_HASH,
            keccak256("NFT.com Domain Auction"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    function _hashTypedDataV4ProfileAuction(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSAUpgradeable.toTypedDataHash(_domainSeparatorV4ProfileAuction(), structHash);
    }

    // primarily used to query
    function getStructHash(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner
    ) public pure returns (bytes32) {
        bytes32 _PERMIT_TYPEHASH = keccak256("Bid(uint256 _nftTokens,string _profileURI,address _owner)");
        return keccak256(abi.encode(_PERMIT_TYPEHASH, _nftTokens, keccak256(bytes(_profileURI)), _owner));
    }

    function returnOwner(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (address) {
        bytes32 structHash = getStructHash(_nftTokens, _profileURI, _owner);

        bytes32 hash = _hashTypedDataV4ProfileAuction(structHash);

        return ECDSAUpgradeable.recover(hash, v, r, s);
    }

    function approveBid(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner
    ) 
        external
    {
        return approveBid_(_nftTokens, _profileURI, _owner);
    }

    function cancelBid(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s)
        external
    {

        return cancelBid_(
          _nftTokens,
          _profileURI,
          _owner,
          Sig(v, r, s)
        );
    }

    /**
     @notice sets ETH fee for buying a profile
     @param _fee denominated in wei
    */
    function setProfileFee(uint256 _fee) external onlyGovernor {
        profileFee = _fee;
    }

    /**
     @notice sets global minimum block wait time to redeem a profile from minting
     @param _wait block number
    */
    function setBlockWait(uint256 _wait) external onlyGovernor {
        blockWait = _wait;
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
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
        require(msg.sender == minter);
        bytes32 hash = requireValidBid_(_nftTokens, _profileURI, _owner, Sig(v, r, s));
        require(!cancelledOrFinalized[hash]);
        require(claimableBlock[hash] == 0);
  
        // effects
        claimableBlock[hash] = block.number;

        // interactions
        // only apply approve permit for first time
        if (IERC20Upgradeable(nftErc20Contract).allowance(_owner, address(this)) == 0) {
            permitNFT(_owner, address(this), nftV, nftR, nftS); // approve NFT token
        }

        require(transferNftTokens(_owner, _nftTokens));         // transfer NFT token

        emit NewClaimableProfile(_owner, _profileURI, _nftTokens, block.number);
    }

    /**
     @notice allows winning profiles (from mintProfileFor) to claim the profile and mint
    */
    function claimProfile(
        uint256 _nftTokens,
        string memory _profileURI,
        address _owner,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable nonReentrant {
        // checks
        require(msg.value == profileFee, "!ETH"); // only required on claim
        require(msg.sender == _owner);
        bytes32 hash = requireValidBid_(_nftTokens, _profileURI, _owner, Sig(v, r, s));
        require(!cancelledOrFinalized[hash]);
        require(claimableBlock[hash] != 0);
  
        // effects
        cancelledOrFinalized[hash] = true;

        // interactions
        INftProfile(nftProfile).createProfile(
            _owner,
            _nftTokens,
            _profileURI,
            blockWait,
            claimableBlock[hash]
        );

        emit MintedProfile(_owner, _profileURI, _nftTokens, claimableBlock[hash]);
        (bool success, ) = payable(coldWallet).call{value: profileFee}("");
        require(success);
    }

    /**
     @notice client facing function to allow profile redemptions for underlying nft tokens
             user will send NFT.com profile to the protocol governor
             user will receive NFT.com collateral with a 0.5% burn fee attached
     @param _tokenId the ID of the NFT.com profile
    */
    function redeemProfile(uint256 _tokenId) external {
        Bid memory details = INftProfile(nftProfile).profileDetails(_tokenId);

        require(details._blockMinted != 0, "invalid or unclaimed profile");

        require(block.number >= 
            details._blockMinted.add(
                details._blockWait), "block wait not met");

        IERC721EnumerableUpgradeable(nftProfile).transferFrom(msg.sender, governor, _tokenId);

        uint256 amount = details._nftTokens.mul(9950).div(10000);

        require(IERC20Upgradeable(nftErc20Contract).transfer(
            msg.sender,
            amount
        ));

        INftToken(nftErc20Contract).burn(
            details._nftTokens.mul(50).div(10000));

        emit RedeemProfile(
            msg.sender,
            details._profileURI,
            block.number,
            amount,
            _tokenId
        );
    }
}