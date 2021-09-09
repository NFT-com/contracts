// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./oz_modified/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface INftToken {
    function burn(uint256 _amount) external;
}

contract CreatorCoin is ERC20 {
    using SafeMath for uint256;

    mapping (address => uint256) private _fees;

    address private nftCashAddress;
    address private nftProfileAddress;

    constructor(
        address _nftProfileContract,
        address _nftCashAddress,
        string memory tokenName,
        string memory tokenSymbol
    ) ERC20(tokenName, tokenSymbol) {
        nftCashAddress = _nftCashAddress;
        nftProfileAddress = _nftProfileContract;
    }

    /**
     @notice abstracted function to mint / burn to save bytecode space
     @param _type 0 = burn, 1+ = mint
     @param _user user calling the mint / burn
     @param profileOwner owner of the profile 721 currently
     @param _creatorFee NFT.com token for creator
     @param _protocolFee NFT.com token for protocol
     @param _remaining  when _type = 1, _remaining is the amount of creator coin to mint after fees
                        when _type = 0, _remaining is the amount of NFT.com tokens to send to _user
     @param _total, only used when _type = 0. _total are the total number of creator coins to burn from _user
    */
    function performAction(
        uint256 _type,
        address _user,
        address profileOwner,
        uint256 _creatorFee,
        uint256 _protocolFee,
        uint256 _remaining,
        uint256 _total
    ) external {
        require(msg.sender == nftProfileAddress);

        // accrue fees
        _fees[profileOwner] = _fees[profileOwner].add(_creatorFee);

        // burn tokens
        INftToken(nftCashAddress).burn(_protocolFee);

        if (_type != 0) {
            _mint(_user, _remaining);
        } else {
            _burn(_user, _total);
            IERC20(nftCashAddress).transfer(_user, _remaining);
        }
    }

    /**
     @notice lets a user claim his/her fees in NFT.com tokens, that have accrued
    */
    function redeemFees() external {
        uint256 currentFee;
        (currentFee, _fees[msg.sender]) = (_fees[msg.sender], 0);
        IERC20(nftCashAddress).transfer(msg.sender, currentFee);
    }

    /**
     @notice fees attributed to the owner of a NFT.com 721 profile
     @return fees denominated in NFT.com coin (18 decimals)
    */
    function fees(address _user) external view returns (uint256) {
        return _fees[_user];
    }
}