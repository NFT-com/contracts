# NFT.com contracts

This repository covers logic for NFT.com profile bidding, and the NFT.com marketplace itself. Further developments will be added here in the future.

See `.env.example` for necessary secrets.

You may need to generate `PUBLIC_SALE_PK` and `PUBLIC_SALE_SIGNER_ADDRESS` being a new wallet for local signing and testing.

### Tools Used

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage): code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Mainnet Tokens

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x8C42428a747281B03F10C80e978C107D4d85E37F)
- [vesting](https://rinkeby.etherscan.io/address/)

  - implementation => x

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/)

  - implementation => x

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/)

  - implementation => x

- [nftTransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/)
  - implementation => x
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/)
  - implementation => x

## Rinkeby

- [deployedNftToken](https://rinkeby.etherscan.io/address/0xd20Cb8c25E5A738f559DF29f64B6E2DD408e44C2)
- [vesting](https://rinkeby.etherscan.io/address/0x1536592da7Ab96480242be8CB9115cEFE81b8e17)

  - implementation => 0x43e6465C8692a82AFEF8569211042919dF6bcBd5

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0x1e01eED656d9aA0B9a16E76F720A6da63a838EA7)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x1c4fFEC2191F97B40721a37271dE59413D817319)
  - implementation => 0x05d277DE3642ee03738Be2ce260B2a206Ae43d6A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0xE197428a3aB9E011ff99cD9d9D4c5Ea5D8f51f49)

  - implementation => 0x3112312F6FbBB1A60A9D72A06387A939e237ee68

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x4ab699B737c64958525172579D5411C4b2C343E7)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0xB58dF73BCB5C109Fe336E5D947979cdc8b397CE5)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0x734a14f4df41f2fA90f8bF7fb7Ce3E2ab68d9cF0)
  - implementation => 0x95de8d9aaE3BA7Fd4322d9b7c9C4511901c14fa0
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x3199524BB7204D1EE0dF76453B22666c82B44178)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0xD954f115a212F328B0aBa249921f414Cb5eE3788)

  - implementation => 0x8E5E12d059801e655ad286cB3549453f9F6C04E9

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x35FC2A74dbb135c27Ab297E869A1B45944BCeFA6)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0xF5cbB8C7955F513226E72524c7E86624Fd1b5ce2)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x76F50139d3719194Ed882928DA2d929e39EbeB3c)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x3d278bB7ee5BcEFE68759Cd578E572f3B6A5774C)
  - implementation => 0x487FD7C7B3869B50BB7e155891cDf8EefA822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x7E635aD1D67f68F4B8D1EAdDDb4577aC2aA686Aa)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0x181030092C8255b9325EAb48712c14D518D1dE6B)
  - implementation => 0x476861725A14c775D950637856c8c80a67d54c31

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
