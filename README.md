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

- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0xDd84b04FeA34c7119077564215b6ebdAD93aeB32)
  - implementation => 0xf43deccb1ed84f94d465fab39f43de3be1f0e8a3
- [deployedNftToken](https://rinkeby.etherscan.io/address/0xBe1BF67300A8c28F805f0399513885D290cA99F7)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x38f85945BBFcc3Ad790cDD2496bE6E79D698A269)
- [deployedPublicStake](https://rinkeby.etherscan.io/address/0xe02618bDF6a9300A267A1d58220c1299E934b534)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x0e9544Ec2d75927DD23899A68b9D0C4f149bC944)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0x031579cE4485170f053F772c0a293C2C62889540)
  - implementation => 0x01ecbd52c3aaba522eb5f458d66daf7cf25fa210
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0xD5e0CEA10321287d6cb70E12dCAd6DCa0Bec8cF8)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x53Bf75Dbcc2E25A8223E78B9760Eca72d7Db9659)
  - implementation => 0xc12dd3D35C5B22B90229a027afD837fa707B5Ad4

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0xeCafF1b04e88E00802167489d0c8577C78479dF8)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x5f6b924793BB528808BDc64D753EC3bd7B36842e)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0xBd3890Cb179c73f4A69bd59C3A709c06982626AD)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x6b8Ae1C1a56F2286c6e5664507ce680F9E8056AA)
  - implementation => 0x487FD7C7B3869B50BB7e155891cDf8EefA822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x4827e7627D64f9D7E1bcc202Ba444f47a5A92082)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0x30Cd409caCE94Ae1550CB2FCEe72489f02406F92)
  - implementation => 0x9556449F3a9F06196A01E92d34e42Efb466073c0

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
