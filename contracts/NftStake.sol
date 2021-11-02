// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NftStake is ERC20Permit {
    using SafeMath for uint256;
    address public nftToken;

    constructor(address _nftToken) ERC20Permit("xNFT.com") ERC20("xNFT.com", "xNFT") {
        nftToken = _nftToken;
    }

    /**
     @notice internal helper function to call allowance for a token
     @param _owner user allowing permit
     @param spender contract allowed to spent balance
     @param v vSig
     @param r rSig
     @param s sSig
    */
    function permitXNFT(
        address _owner,
        address spender,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private {
        return IERC20Permit(nftToken).permit(_owner, spender, 2**256 - 1, 2**256 - 1, v, r, s);
    }

    /**
     @notice function for allowing a user to stake
     @param _amount amount of NFT tokens to stake
     @param v optional vSig param for permit
     @param r optional rSig param for permit
     @param s optional sSig param for permit
    */
    function enter(
        uint256 _amount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        // only apply approve permit for first time
        if (IERC20(address(this)).allowance(msg.sender, address(this)) < _amount) {
            permitXNFT(msg.sender, address(this), v, r, s); // approve xNFT token
        }

        IERC20(nftToken).transferFrom(msg.sender, address(this), _amount);

        uint256 totalNftTokenLocked = IERC20(nftToken).balanceOf(address(this));
        uint256 totalSupply = totalSupply();

        if (totalSupply == 0 || totalNftTokenLocked == 0) {
            _mint(msg.sender, _amount);
        } else {
            uint256 xNftTokenAmount = _amount.mul(totalSupply).div(totalNftTokenLocked);
            _mint(msg.sender, xNftTokenAmount);
        }
    }

    function leave(uint256 _xNftAmount) public {
        uint256 totalSupply = totalSupply();

        uint256 nftAmount = _xNftAmount.mul(IERC20(nftToken).balanceOf(address(this))).div(totalSupply);
        _burn(msg.sender, _xNftAmount);
        IERC20(nftToken).transfer(msg.sender, nftAmount);
    }
}
