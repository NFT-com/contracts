// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./X2Y2/structs.sol";

interface IX2Y2 {
    function run(
        RunInput memory input
    ) external;
}

library X2Y2LibV1 {
    address public constant X2Y2 = 0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3;

    function _run(
        RunInput memory _input,
        uint256 _msgValue,
        bool _revertIfTrxFails
    ) internal {
        bytes memory _data = abi.encodeWithSelector(
            IX2Y2.run.selector,
            _input
        );

        (bool success, ) = X2Y2.call{ value: _msgValue }(_data);

        if (!success && _revertIfTrxFails) {
            // Copy revert reason from call
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }
}
