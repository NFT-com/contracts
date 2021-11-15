// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../exchange/NftExchange.sol";

contract NftExchangeV2 is NftExchange {
    string private constant testVariable = "hello";

    function getVariable() public pure returns (string memory) {
        return testVariable;
    }

    function testFunction() public pure returns (uint256) {
        return 12345;
    }
}
