// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IGK {
    function tokenIdsOwned(address user) external view returns (bool[] memory);

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

contract GenesisKeyTeamClaim is Initializable, UUPSUpgradeable {
    using SafeMathUpgradeable for uint256;

    address public owner;
    address public genesisKeyMerkle;
    IGK public GK;
    event ClaimedGenesisKey(address indexed _user, uint256 _amount, uint256 _blockNum, bool _whitelist);

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    function initialize(IGK _GK) public initializer {
        __UUPSUpgradeable_init();

        GK = _GK;
        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // governance functions =================================================================
    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function setGenesisKeyMerkle(address _newMK) external onlyOwner {
        genesisKeyMerkle = _newMK;
    }

    // =========POST WHITELIST CLAIM KEY ==========================================================================
    /**
     @notice allows winning keys to be self-minted by winners
    */
    function teamClaim(address recipient) external returns (bool) {
        // checks
        require(msg.sender == genesisKeyMerkle);

        // effects
        // interactions
        bool[] memory ownedIds = GK.tokenIdsOwned(address(this));

        for (uint256 i = 0; i < ownedIds.length; i++) {
            if (ownedIds[i]) {
                GK.transferFrom(address(this), recipient, i);
                emit ClaimedGenesisKey(recipient, 0, block.number, true);
                return true;
            }
        }

        return false;
    }
}
