// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NftTokenV1 is Initializable,
    ERC20PermitUpgradeable,
    UUPSUpgradeable
{
    address internal owner;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __ERC20Permit_init("NFT.com");
        __ERC20_init("NFT.com", "NFT");
        _mint(msg.sender, 10 * 10 ** 9 * 10 ** 18);

        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
     @notice allows token burns (protocol fees)
     @param _amount amount of NFT.com tokens to burn
    */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    function setOwner(address _new) external onlyOwner {
        owner = _new;
    }
}
