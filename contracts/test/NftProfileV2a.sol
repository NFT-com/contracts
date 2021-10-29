// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../NftProfileV1.sol";

contract NftProfileV2a is NftProfileV1 {
    string private constant testVariable = "hello";

    function getVariable() public pure returns (string memory) {
        return testVariable;
    }

    function testFunction() public pure returns (uint256) {
        return 12345;
    }
}
