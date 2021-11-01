// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract NftToken is ERC20Permit {
    constructor() ERC20Permit("NFT.com") ERC20("NFT.com", "NFT") {
        _mint(msg.sender, 10 * 10 ** 9 * 10 ** 18);
    }

    /**
     @notice allows token burns (protocol fees)
     @param _amount amount of NFT.com tokens to burn
    */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}
