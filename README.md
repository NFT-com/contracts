# NFT.com contracts

This repository covers logic for NFT.com profile bidding, and the NFT.com marketplace itself. Further developments will be added here in the future.

### Tools Used

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage): code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Usage

ZERO_BYTES = `0x0000000000000000000000000000000000000000000000000000000000000000`

## Rinkeby Address

- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x9F6ED3d90D48573245d6a0c0742db4eCf27B6a56)
  - implementation => 0xc3d64c2f994df319f52f8158d787593e65872585
- [deployedNftToken](https://rinkeby.etherscan.io/address/0xa75F995f252ba5F7C17f834b314201271d32eC35)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x1eCF99bB796fC05b6E409CE5d4682353A166852b)
- [deployedNftStake](https://rinkeby.etherscan.io/address/0xB1f851f3a250Fc1FFdd4eDdFB3529BfFe379924B)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0xED98f77010891884A63da7605c6B7DE6E4eD91F1)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0xc5782D87B3d353edbf1B03dEB001949Afd2e25E8)
  - implementation => 0x0f78239245b45044d0f475a04c5caa41e266c4ee
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x2295828BBB9270cF92D29ed79bA0260d64fdF23f)
  - implementation => 0x0c82A8a9e93101C5Bee4bece3771EE5c21e28837

### Pre Requisites

Before running any command, you need to create a `.env` file and set a BIP-39 compatible mnemonic as an environment
variable. Follow the example in `.env.example`. If you don't already have a mnemonic, use this [website](https://iancoleman.io/bip39/) to generate one.

Then, proceed with installing dependencies:

```sh
yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
$ REPORT_GAS=true yarn test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

### Deploy

Deploy the contracts to Hardhat Network:

```sh
$ yarn deploy --greeting "Bonjour, le monde!"
```

## Syntax Highlighting

If you use VSCode, you can enjoy syntax highlighting for your Solidity code via the
[vscode-solidity](https://github.com/juanfranblanco/vscode-solidity) extension. The recommended approach to set the
compiler version is to add the following fields to your VSCode user settings:

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.4+commit.c7e474f2",
  "solidity.defaultCompiler": "remote"
}
```

Where of course `v0.8.4+commit.c7e474f2` can be replaced with any other version.
