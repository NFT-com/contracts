// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../ProfileAuctionV2.sol";

contract ProfileAuctionV3 is ProfileAuctionV2 {
    string private constant testVariable = "hello";

    function getVariable() public pure returns (string memory) {
        return testVariable;
    }

    function testFunction() public pure returns (uint256) {
        return 12345;
    }
}
