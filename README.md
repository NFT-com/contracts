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

## Goerli ==========================================================================================

- [deployedNftToken](https://goerli.etherscan.io/address/0x7ffe04f3213d893bb4ebe76fbb49ca2a8f9c4610)
- [vesting](https://goerli.etherscan.io/address/0x0638A014c45BE910d4611bAfaBcC8219A075788B)

  - implementation => 0x2Ddbe998e6868Bc929FDeD9B7442F10D32D520fa

- [deployedGkTeamDistributor](https://goerli.etherscan.io/address/0x85c7fBFD62C4470Ee6C0Eb8a722c92d7cD840A11)
- [deployedGenesisKeyTeamClaim](https://goerli.etherscan.io/address/0x7B7d88d7718294E27575aA7F4d1e2F25fF51b81c)
  - implementation => 0x4a76adbfF8aA29e0B6E051660119768e0f870557
- [deployedGenesisKey](https://goerli.etherscan.io/address/0xe0060010c2c81A817f4c52A9263d4Ce5c5B66D55)

  - implementation => 0xf4D214C53762edFaB8a3744C9878466D9b1f1648

- [deployedNftGenesisStake](https://goerli.etherscan.io/address/tbd)
- [deployedNftProfileHelper](https://goerli.etherscan.io/address/0x3efb23c05DD34035fDb23cC74D85Ec586A2e7068)
- [deployedNftProfile](https://goerli.etherscan.io/address/0x9Ef7A34dcCc32065802B1358129a226B228daB4E)
  - implementation => 0x073272c91A741E453aE47c10Be2F7ab5131B0706
- [deployedNftBuyer](https://goerli.etherscan.io/address/tbd)
- [deployedProfileAuction](https://goerli.etherscan.io/address/0x40023d97Ca437B966C8f669C91a9740C639E21C3)

  - implementation => 0x60D0070b319c1Fe1D08EecD9C0c4b4D3909c17c6

- [deployedEthereumRegex](https://goerli.etherscan.io/address/0x6379A115EA1E18E817f8B3aA4990E217822B1C38)
- [deployedNftResolver](https://goerli.etherscan.io/address/0x3a3539B6727E74fa1c5D4d39B433F0fAB5BC4F4a)

  - implementation => 0x7927190920E74259d96f9be470A34a79e9bf49AF

- [deployedGenesisKeyDistributor](https://goerli.etherscan.io/address/)

- [nftTransferProxy](https://goerli.etherscan.io/address/)
  - implementation => tbd
- [deployedERC20TransferProxy](https://goerli.etherscan.io/address/)
  - implementation => tbd
- [deployedCryptoKittyTransferProxy](https://goerli.etherscan.io/address/)
  - implementation => tbd
- [deployedValidationLogic](https://goerli.etherscan.io/address/)
  - implementation => tbd
- [deployedMarketplaceEvent](https://goerli.etherscan.io/address/)
  - implementation => tbd
- [deployedNftMarketplace](https://goerli.etherscan.io/address/)
  - implementation => tbd

## [DEPRECATED] Rinkeby ============================================================================

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

- [deployedNftAggregator](htts://rinkeby.etherscan.io/address/0x6579A513E97C0043dC3Ad9Dfd3f804721023a309)
  - implementation => 0x83FFcEE83360e75434b8F0a8dB17f0EcFA751B33

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
