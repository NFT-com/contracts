// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../../marketplace/lib/LibSignature.sol";

interface INativeNftTrading {
    function executeSwap(
        LibSignature.Order calldata sellOrder,
        LibSignature.Order calldata buyOrder,
        uint8[2] calldata v,
        bytes32[2] calldata r,
        bytes32[2] calldata s
    ) external;
}

error InvalidChain();

library NativeNftTradingLib {
    function _executeSwap(
        LibSignature.Order calldata sellOrder,
        LibSignature.Order calldata buyOrder,
        uint8[2] calldata v,
        bytes32[2] calldata r,
        bytes32[2] calldata s,
        uint256 _msgValue,
        bool _revertIfTrxFails
    ) external {
        bytes memory _data = abi.encodeWithSelector(
            INativeNftTrading.executeSwap.selector,
            sellOrder,
            buyOrder,
            v,
            r,
            s
        );

        address NftNativeTrading;
        if (block.chainid == 1) {
            revert InvalidChain();
            // mainnet
            // NftNativeTrading = // TODO:;
        } else if (block.chainid == 5 || block.chainid == 31337) {
            NftNativeTrading = 0xa75F995f252ba5F7C17f834b314201271d32eC35;
        } else {
            revert InvalidChain();
        }

        (bool success, ) = NftNativeTrading.call{ value: _msgValue }(_data);

        if (!success && _revertIfTrxFails) {
            // Copy revert reason from call
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }
}