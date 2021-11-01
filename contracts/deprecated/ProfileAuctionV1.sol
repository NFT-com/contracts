// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interface/INftProfileHelper.sol";
import "../interface/INftProfile.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

interface INftToken {
    function burn(uint256 _amount) external;
}

/// @title DEPRECATED Contract (ProfileAuctionV1)
/// @author @gmaijoe
/// @notice this contract is deprecated due to expensive on-chain fees.
/// profileAuctionV2 does a similar task of bidding but uses off-chain signatures
/// units tests will still run for this contract

contract ProfileAuctionV1 is Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMathUpgradeable for uint256;

    mapping(address => Bid[]) internal _bids;

    address public governor;
    address public minter;
    address public owner;
    address public nftErc20Contract;
    address public nftProfile;
    bool public publicClaim;
    uint256 public staticFee;
    uint256 public profileFee;
    uint256 public blockWait;
    address public nftProfileHelperAddress;
    address public coldWallet;

    enum Action { SubmitBid, RemoveBid, MintProfile, RedeemProfile }

    event UpdateBid(address _user, string _val, uint256 _addition, uint256 _final);
    event NewBid(address _user, string _val, uint256 _amount);
    event RemoveBid(address _user, string _val, uint256 _amount);
    event RedeemProfile(address _user, string _val, uint256 _block, uint256 _amount, uint256 _tokenId);
    event MintedProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);
    event NewClaimableProfile(address _user, string _val, uint256 _amount, uint256 _blockNum);
    event ChangedBidURI(address _user, string _old, string _new, uint256 _merge); // _merge = 0 => new order, 1 => merged existing order

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
        profileFee = 5 * 10 ** 17;      // 0.5 ETH
        staticFee = 10000 * 10 ** 18;   // 10,000 NFT tokens
        publicClaim = false;
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

    function validURI(string memory _name) private view returns (bool) {
        return INftProfileHelper(nftProfileHelperAddress)._validURI(_name);
    }

    /**
        @notice compares two strings
        @param a string 1
        @param b string 2
        @return true if a == b, false
    */
    function compareString(string memory a, string memory b) private pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /**
     @notice internal function to help reduce gas costs
     @param _user address of behalf the bid is for
     @param _profileURI the profile URI
     @param _action 0 = submitBidFor (new or existing), 1 = remove bid, 2 = mint profile for, 3 = claim profile
    */
    function findEffectDeleteArray(
        address _user,
        string memory _profileURI,
        Action _action,
        uint256 _nftTokens
    ) private returns (bool) {
        Bid[] storage bids = _bids[_user];

        // loop through existing bids
        for (uint256 i = 0; i < bids.length; i++) {
            if (compareString(bids[i]._profileURI, _profileURI)) {
                if (_action == Action.SubmitBid) {
                    require(_bids[_user][i]._blockMinted == 0, "claim");

                    uint256 newBid = _bids[_user][i]._nftTokens.add(_nftTokens);
                    
                    emit UpdateBid(_user, _profileURI, _nftTokens, newBid);
                    _bids[_user][i]._nftTokens = newBid;
                    return true;
                } else if (_action == Action.RemoveBid) {
                    require(_bids[_user][i]._blockMinted == 0, "claim");
                    uint256 _amount = _bids[_user][i]._nftTokens.mul(9950).div(10000);

                    emit RemoveBid(
                        _user,
                        _profileURI,
                        _amount
                    );

                    require(IERC20Upgradeable(nftErc20Contract).transfer(
                        _user,
                        _amount
                    ));

                    INftToken(nftErc20Contract).burn(_bids[_user][i]._nftTokens.mul(50).div(10000));
                } else if (_action == Action.MintProfile) {
                    // 2 is set by our minter
                    // set block minted => this prevents user from withdrawing bid, they must now claim
                    _bids[_user][i]._blockMinted = block.number;
                    emit NewClaimableProfile(_user, _profileURI, _bids[_user][i]._nftTokens, block.number);

                    return true; // do not delete bid if just allowing to claim
                } else {
                    require(_bids[_user][i]._blockMinted != 0);

                    emit MintedProfile(_user, _profileURI, _bids[_user][i]._nftTokens, _bids[_user][i]._blockMinted);

                    INftProfile(nftProfile).createProfile(
                        _user,
                        _bids[_user][i]._nftTokens,
                        _bids[_user][i]._profileURI,
                        blockWait,
                        _bids[_user][i]._blockMinted
                    );

                    (bool success, ) = payable(coldWallet).call{value: profileFee}("");
                    require(success);
                }
                
                deleteBid(i, _user);
                return true;
            }
        }

        // comes here if no existing bids are found
        if (_action == Action.SubmitBid) {
            bids.push(Bid(
                _nftTokens,
                0,
                _profileURI,
                0
            ));
            emit NewBid(_user, _profileURI, _nftTokens);
        } else {
            // remove bid, mint for, claim profile not found
            require(false, "!exist");
        }

        return true;
    }

    /**
     @notice active bids for a given user
     @param _user user we are interested in
     @return active bids for a given user
    */
    function getBids(address _user) external view returns (Bid[] memory) {
        return _bids[_user];
    }

    /**
     @notice opens self-serve registration
     @param _val self-serve boolean
    */
    function setPublicClaim(bool _val) external onlyGovernor {
        publicClaim = _val;
    }

    /**
     @notice sets NFT.com token minimum stake for acquiring profile using self-serve registration
     @param _rate NFT.com ERC20 tokens (18 decimals)
    */
    function setStaticFee(uint256 _rate) onlyGovernor external {
        staticFee = _rate;
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
     @notice submit bid for profile
             this function combines both creating a new bid, and increasing an existing bid
     @param _nftTokens the number of NFT.com tokens used to stake
     @param _profileURI the profile one would like to buy
    */
    function submitProfileBid(
        uint256 _nftTokens,
        string memory _profileURI
    ) external nonReentrant validAndUnusedURI(_profileURI) {
        require(transferNftTokens(msg.sender, _nftTokens));
        findEffectDeleteArray(msg.sender, _profileURI, Action.SubmitBid, _nftTokens);
    }

    /**
     @notice helper function for deleting a bid from storage
             this is used when a bid is removed, or if the bid wins and is minted for
     @param _index index of the bid for a particular user
     @param _user user we deleting bid for
    */
    function deleteBid(uint256 _index, address _user) private {
        Bid[] storage bids = _bids[_user];
        if (_index < bids.length - 1) bids[_index] = bids[bids.length - 1];
        bids.pop();
    }

    /**
     @notice allows users to change bid without unstaking and restaking, saves gas
     @param _oldProfileURI exisitng bid URI
     @param _newProfileURI new bid URI
    */
    function changeBidURI(
        string memory _oldProfileURI,
        string memory _newProfileURI
    ) external nonReentrant validAndUnusedURI(_newProfileURI) {
        require(!compareString(_oldProfileURI, _newProfileURI));

        Bid[] storage bids = _bids[msg.sender];

        uint256 j = 0; // index of the _oldProfileURI
        uint256 k = 0; // index of the _newProfileURI

        // loop through existing bids
        for (uint256 i = 0; i < bids.length; i++) {
            if (compareString(bids[i]._profileURI, _oldProfileURI)) j = i.add(1);

            if (compareString(bids[i]._profileURI, _newProfileURI)) k = i.add(1);
        }

        if (j != 0) {
            // _blockMinted == 0 when it has not been minted for
            // we want to make sure the bids here are not winners, and awaiting claim
            require(_bids[msg.sender][j.sub(1)]._blockMinted == 0, "claim");

            if (k != 0) { // merge orders
                require(_bids[msg.sender][k.sub(1)]._blockMinted == 0, "claim");

                _bids[msg.sender][k.sub(1)]._nftTokens = _bids[msg.sender][k.sub(1)]._nftTokens.add(
                    _bids[msg.sender][j.sub(1)]._nftTokens); // add tokens

                deleteBid(j.sub(1), msg.sender);

                emit ChangedBidURI(msg.sender, _oldProfileURI, _newProfileURI, 1);
            } else { // newProfile is a new order
                _bids[msg.sender][j.sub(1)]._profileURI = _newProfileURI;
                emit ChangedBidURI(msg.sender, _oldProfileURI, _newProfileURI, 0);
            }
        } else {
            require(false, "!exist");
        }

    }

    /**
     @notice submit bid for profile using permit
     @param _nftTokens the number of NFT.com tokens used to stake
     @param _profileURI the profile one would like to buy
    */
    function submitProfileBidWithPermit(
        uint256 _nftTokens,
        string memory _profileURI,
        uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant validAndUnusedURI(_profileURI) {
        IERC20PermitUpgradeable(nftErc20Contract).permit(msg.sender, address(this), 2**256 - 1, 2**256 - 1, v, r, s);

        require(transferNftTokens(msg.sender, _nftTokens));
        findEffectDeleteArray(msg.sender, _profileURI, Action.SubmitBid, _nftTokens);
    }

    /**
     @notice client facing function to remove bid on profile
     @param _profileURI the profile one would like to buy
    */
    function removeProfileBid(
        string memory _profileURI
    ) external nonReentrant {
        findEffectDeleteArray(msg.sender, _profileURI, Action.RemoveBid, 0);
    }

    /**
     @notice centralized mint function for auction profiles, restricted to minter
             _buyer must have submitted a bid for _profileURI
     @param _buyer the address of the winning buyer
     @param _profileURI the profile one would like to buy
    */
    function mintProfileFor(
        address _buyer,
        string memory _profileURI
    ) external nonReentrant {
        require(msg.sender == minter);
        findEffectDeleteArray(_buyer, _profileURI, Action.MintProfile, 0);
    }

    /**
     @notice client facing self-service registration of profiles in the future (fixed fee)
     @param _profileURI the profile URI one wants to buy
    */
    function buyProfile(
        string memory _profileURI
    ) external payable nonReentrant validAndUnusedURI(_profileURI) {
        require(publicClaim, "!claim");
        require(msg.value == profileFee, "!ETH");
        require(transferNftTokens(msg.sender, staticFee));

        INftProfile(nftProfile).createProfile(
            msg.sender, 
            staticFee,
            _profileURI,
            blockWait,
            block.number
        );

        (bool success, ) = payable(coldWallet).call{value: profileFee}("");
        require(success);
    }

    /**
     @notice self-service registration of profile using a permit
     @param _profileURI the profile URI one wants to buy
    */
    function buyProfileWithPermit(
        string memory _profileURI,
        uint8 v, bytes32 r, bytes32 s
    ) external payable nonReentrant validAndUnusedURI(_profileURI) {
        require(publicClaim, "!claim");
        require(msg.value == profileFee, "!ETH");

        IERC20PermitUpgradeable(nftErc20Contract).permit(msg.sender, address(this), 2**256 - 1, 2**256 - 1, v, r, s);
        require(transferNftTokens(msg.sender, staticFee));

        INftProfile(nftProfile).createProfile(
            msg.sender, 
            staticFee,
            _profileURI,
            blockWait,
            block.number
        );

        (bool success, ) = payable(coldWallet).call{value: profileFee}("");
        require(success);
    }

    /**
     @notice allows winning profiles (from mintProfileFor) to claim the profile and mint
     @param _profileURI the profile URI msg.sender as already won for
    */
    function claimProfile(
        string memory _profileURI
    ) external nonReentrant validAndUnusedURI(_profileURI) payable {
        require(msg.value == profileFee, "!ETH"); // only required on claim
        findEffectDeleteArray(msg.sender, _profileURI, Action.RedeemProfile, 0);
    }

    /**
     @notice client facing function to allow profile redemptions for underlying nft tokens
             user will send NFT.com profile to the protocol governor
             user will receive NFT.com collateral with a 0.5% burn fee attached
     @param _tokenId the ID of the NFT.com profile
    */
    function redeemProfile(uint256 _tokenId) external nonReentrant {
        // checks
        Bid memory details = INftProfile(nftProfile).profileDetails(_tokenId);

        require(details._blockMinted != 0, "invalid or unclaimed profile");

        require(block.number >= 
            details._blockMinted.add(
                details._blockWait), "block wait not met");

        uint256 amount = details._nftTokens.mul(9950).div(10000);

        emit RedeemProfile(
            msg.sender,
            details._profileURI,
            block.number,
            amount,
            _tokenId
        );

        // effects

        // interactions
        IERC721EnumerableUpgradeable(nftProfile).transferFrom(msg.sender, governor, _tokenId);
        require(IERC20Upgradeable(nftErc20Contract).transfer(
            msg.sender,
            amount
        ));

        INftToken(nftErc20Contract).burn(details._nftTokens.mul(50).div(10000));
    }
}