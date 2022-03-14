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

## Rinkeby Address

- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0xb5815c46D262005C170576330D0FB27d018fAd60)
  - implementation => 0x1ddd02d080681b3dc14f79c48b785cc1d3973928
- [deployedNftToken](https://rinkeby.etherscan.io/address/0x6e62f41A3aDf9f30fab56060D62bCFeB08C7F501)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x35b8eaC589B6de7534D11cf30b8069c7fEa8A6C3)
- [deployedPublicStake](https://rinkeby.etherscan.io/address/0x9Eb10c976E7f8D7A1bD992239e7513978963E32f)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x8515765a5B77c506cA7AAdE5c9891d9cFb8AdbfE)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0xA2395cd351A8E7cbB3af729060FDB813738313ff)
  - implementation => 0x3cA3F3F910E555fb94811fec672dBFD7E019985b
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0xe2d257DD0c8989aD30963633120ff35055B1fB62)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x941BA75176396e4Fa168750b7927EF42DF67FF0C)
  - implementation => 0x1a77fec807e9924cf079c9d7384e37c79851f25c

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0xA3802263Ee1305de54c2E8b24a800EF82B564742)
  - implementation => 0x1daddd1658b4c4bf171d2a9cb9b22d82e69bf913
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x32B091f6Af61bfC0dC78D22DAfCc981e3403350c)
  - implementation => 0x24531A12A8131D762dD030e4579499DAEFC02f89
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x24AC307422b694c71242e37C297b7fD26E09f4cD)
  - implementation => 0x8857f746879E4413A56Bd45B69ED5651611C1294
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0x5e6420d2EceF69265503797c6a3D1f6f6188b024)
  - implementation => 0xa9C8CC1bc2f3fEb69B445e90f9Ff9938c9dE7583

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
