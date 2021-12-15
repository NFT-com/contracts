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

- [deployedNftStake](https://rinkeby.etherscan.io/address/0xAcde72B0959D0c7c56d133B30850FE227BE71845)
- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x9170DF8C1B8220854970B4d878497b23DeCc8e03)
  - implementation => 0xdfa0914e53b3c222fcbf67cd3cd89474e7b63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x95E064204B5663711f659d1CeF8e60F14Ba1197c)
  - implementation => 0xfecf248854c3a4e36a37ce04e7f025f718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0xbf5dAEC8DecD24e6e32B4123ce5aB708E2667316)
  - implementation => 0x67a59654e2ec02f12fbbcb6a2a758c7ab7c2c8e5
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0x6F5E3F2283c21953CB8cdba0e077f30F7C4Bc681)
  - implementation => 0xcdceb00d9d72390edf03404110ef05c65b547cb9

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
