// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IGenesisKeyStake {
    function stakedAddress(address _user) external view returns (uint256);
<<<<<<< HEAD

    function totalSupply() external view returns (uint256);

    function totalStakedNftCoin() external view returns (uint256);
=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
}
