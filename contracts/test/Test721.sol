// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Test721 is ERC721 {
    constructor() ERC721("Test", "Symbol") {}

    function mint(uint256 _tokenId) public {
        _mint(msg.sender, _tokenId);
    }
}
