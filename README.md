# NFT.com contracts

[![codecov](https://codecov.io/gh/NFT-com/contracts/branch/main/graph/badge.svg?token=A91QO5LR7O)](https://codecov.io/gh/NFT-com/contracts)

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

- [udonft](https://etherscan/address/0xa16DD71dE047A086730a0E46Ea60251f2f4104c1)

- [deployedNftToken](https://etherscan.io/address/0x8C42428a747281B03F10C80e978C107D4d85E37F)
- [vesting](https://etherscan.io/address/0x774c2204D9e50CD9d6A579D194c067360604933f)

  - implementation => 0xC3A7cE08ADBFbfce8b79Bf8d0A6Df16265d1cE3a

- [deployedGkTeamDistributor](https://etherscan.io/address/0x5fb1941b5415b4817d9CC62f8039F7A4B366Ff8F)
- [deployedGenesisKeyTeamClaim](https://etherscan.io/address/0xfc99E6b4447a17EA0C6162854fcb572ddC8FbB37)
  - implementation => 0x22574f03886C45EEd9C2e7a52e045074c365681A
- [deployedGenesisKey](https://etherscan.io/address/0x8fB5a7894AB461a59ACdfab8918335768e411414)

  - implementation => 0xEb445c800DA2FC81b12391d59426d86F4BEBEa0a

- [deployedNftProfileHelper](https://etherscan.io/address/0xB9A5A787153b6C4898cb2A05A596A22E73B1DCc1)
- [deployedNftProfileProxy](https://etherscan.io/address/0x98ca78e89Dd1aBE48A53dEe5799F24cC1A462F2D)
  - implementation => 0x5Ae961219E4e2e26b4028CaaAfdEFa26A72acF2B
- [deployedProfileAuctionProxy](https://etherscan.io/address/0x30f649D418AF7358f9c8CB036219fC7f1B646309)

  - implementation => 0xBdF4538fb1a3863fA48E96A081911d04A21FbC49

- [deployedGenesisKeyDistributor](https://etherscan.io/address/0x0eBa8d862AF4E01A0573B663FB3eb3A06D7937dE)

- [deployedNftBuyer](https://etherscan.io/address/)
- [deployedNftGenesisStake](https://etherscan.io/address/)
- [nftTransferProxy](https://etherscan.io/address/)
  - implementation => x
- [deployedERC20TransferProxy](https://etherscan.io/address/)
  - implementation => x
- [deployedCryptoKittyTransferProxy](https://etherscan.io/address/)
  - implementation => x
- [deployedValidationLogic](https://etherscan.io/address/)
  - implementation => x
- [deployedMarketplaceEvent](https://etherscan.io/address/)
  - implementation => x
- [deployedNftMarketplace](https://etherscan.io/address/)
  - implementation => x

## Rinkeby ===============================================================================

- [deployedNftToken](https://rinkeby.etherscan.io/address/0xd60054F74c9685e5F9E474F36344494D6a1DB3cF)
- [vesting](https://rinkeby.etherscan.io/address/0x3b6b2ddC1878dACbC99b9Bfb099A7c3DcfB76da5)

  - implementation => 0xDF3Ef9a0DF7B53eF5FC2679Ba55409989e28069B

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0x7a546F59e04Fff0b5eD3Ee13e30F38917C74741B)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x41E3E44e2Db9fFC7b69CF459441C80F95Cb25fCc)
  - implementation => 0x49A48Cb9FD8BCb488d6b817352D0E166f9bD4900
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x530E404f51778F38249413264ac7807A16b88603)

  - implementation => 0x0F7EBB85e57222A1247ce493dd29165cFBd16118

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xe1f5466cbd61652D792E4A5c07D0F59E6c3d360a)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0xb47B53c03DAD5a03a5392283DF8826e798E2Bc29)
- [deployedNftProfile](https://rinkeby.etherscan.io/address/0x7e229a305f26ce5C39AAB1d90271e1Ef03d764D5)
  - implementation => 0xb800415C7E49795f2514b97d6feb4b292C3937eb
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0xbd0119747f92682a6453a66c9Dc2E49b1F3EE399)
- [deployedProfileAuction](https://rinkeby.etherscan.io/address/0x1338A9ec2Ef9906B57082dB0F67ED9E6E661F4A7)

  - implementation => 0xd5339967aebE3b610e381Dc32B598450e8085545

- [deployedGenesisKeyDistributor](https://rinkeby.etherscan.io/address/0x00d185Cdc08d26c71792d3D4664D2375Ce6097DE)

- [nftTransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/)
  - implementation => 0x9B0aB7a56486E6ed12ad22Ce29a657B7268B77B4
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/)
  - implementation => 0x9a47cFd45718dB5BEEA2aA200BE50E157023469c

### Regex Generation

1. npm install -g solregex2
2. solregex2 --name RegexContractName '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-_]+\.[a-zA-Z]{2,}'

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

[Live Coverage][https://prod-contracts-coverage.nft.com/] (only for member on NFT.com's Github)

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
