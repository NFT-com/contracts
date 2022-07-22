// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

error InvalidChain();

library LooksrareLibV1 {
    function _tradeHelper(uint256 value, bytes tradeData, address asset, uint256 tokenId) external returns (bool) {
        address looksrareExchange;

        if (block.chainid == 1) { // mainnet
            looksrareExchange = 0x59728544B08AB483533076417FbBB2fD0B17CE3a
        } else if (block.chainid == 4) { // rinkeby
            looksRareExchange = 0x1AA777972073Ff66DCFDeD85749bDD555C0665dA
            return true;
        } else {
            revert InvalidChain();
        }

        (bool success, ) = address(looksrareExchange).call{ value: value }( tradeData );

        if (success) {
            // return back nft
            asset.call(abi.encodeWithSelector(0x23b872dd, address(this), msg.sender, tokenId));
        }

        return success
    }
}
