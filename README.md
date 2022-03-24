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

- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0xAed146B7E487B2d64b51B6D27F75c1f52247050a)
  - implementation => 0xf04A008C35c6E168661189bcf8BFdeede8fc7309
- [deployedNftToken](https://rinkeby.etherscan.io/address/0xFD080f88e4dA08cAA35744b281481cc86b95D287)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xaeE6068b3E6F7eA9a12CdA76E2aE8dCf1B31669B)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x1F0d2D6710f58E8383A194D647fE8FD20430D73E)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0x4Defe27b42e870E36BD693Bd7d4514e80272bF1e)
  - implementation => 0xad4C038f2744a8ab687A7b8fdDfE9DABD3d8fb6c
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0xC47FA495c5DaCd88D7A5D52B8274e251c6609cf5)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x96c7a4c8babfA1f24f275Ad93a02319E76c395fe)
  - implementation => 0x627B5f2A47e8d0798095c6feC33dd84A67EC3357

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x25af0Aca0830088CdD48aCA06143bA82826D7b55)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0xaAb1808320B220fc1EEB48Ea4E03Ba44CA5ca3Ea)
  - implementation => 0xfecf248854c3a4e36a37ce04e7f025f718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x9c9D896a63F92D034174205b2ab6288035e313e8)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x54d6c3C9Cefcfa96C9e9e020d456D6FF172807D8)
  - implementation => 0x487FD7C7B3869B50BB7e155891cDf8EefA822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x8Bbf505ce08553A4F0083Fc1166195B0cB837Ab7)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0xc70090a2d719b4f9BB73084A48900510457d350E)
  - implementation => 0x9556449F3a9F06196A01E92d34e42Efb466073c0
- [deployedGenesisKeyDistributor](https://rinkeby.etherscan.io/address/)

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
