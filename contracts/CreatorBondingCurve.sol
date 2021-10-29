// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./interface/ICreatorBondingCurve.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreatorBondingCurve {
    using SafeMath for uint256;

    uint256 public numerator;
    uint256 public denominator;

    constructor(uint256 _numerator, uint256 _denominator) {
        numerator = _numerator;
        denominator = _denominator;
    }

    /**
     @dev Babylonian Method by @dapp-bin and @uniswap
     @dev https://github.com/ethereum/dapp-bin/pull/50/files
     @dev https://github.com/Uniswap/v2-core/blob/v1.0.1/contracts/libraries/Math.sol
     @notice calculates the square root of a given uint256
     @param x input number
     @return square root approximation of x
    */
    function sqrt(uint256 x) internal pure returns (uint256) {
        uint256 z = (x.add(1)).div(2);
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x.div(z).add(z)).div(2);
        }

        return y;
    }

    /**
     @notice calculates the number of NFT.com tokens required to mint / burn creator tokens
     @param _type 1 = mint, 0 = burn
     @param _creatorCoin address of creator coin contract
     @param _amount _type = 1: # of NFT.com tokens sent, _type = 0, # of creator coins burned
     @return _type = 1: # of creator coins to mint, _type = 0, # of NFT.com tokens to return
    */
    function getPrice(
        uint256 _type,
        address _creatorCoin,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 x = IERC20(_creatorCoin).totalSupply();
        uint256 y = _amount;
        uint256 b = x.mul(x);

        if (_type != 0) {
            uint256 a = y.mul(denominator).div(numerator);
            uint256 c = a.add(b);

            return sqrt(c).sub(x);
        } else {
            // _type == 0
            require(x >= y);
            uint256 z = x.sub(y);
            uint256 a = z.mul(z);
            uint256 c = b.sub(a);

            return numerator.mul(c).div(denominator);
        }
    }
}
