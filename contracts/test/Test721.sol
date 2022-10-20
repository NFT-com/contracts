// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Test721 is ERC721 {
    uint256 public totalSupply;
    
    constructor() ERC721("Test", "Symbol") {}

    function mint() public {
        _mint(msg.sender, totalSupply);
        totalSupply += 1;
    }

    function mint(uint256 tokenId) public {
        _mint(msg.sender, tokenId);
        totalSupply += 1;
    }
}
