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

## Mainnet Tokens

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x025195c0660f6Db8D2EC836f9f1d418Da1A01a8e)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/)
  - implementation =>
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/)
  - implementation =>

## Rinkeby GK

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0xf4CB1960416a7a676eE1AB9C6808B73254EEE32F)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0xb2e8e382df819AA3EBb29906f613A8609F918e2e)
  - implementation => 0x05d277DE3642ee03738Be2ce260B2a206Ae43d6A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x52Ec5398c29d6627E543931C473Ba36c2bBE0f5C)
  - implementation => 0x43653AF07633BBE22Cd5840dD5E616D4Cd357AE6

## Rinkeby Tokens

- [deployedNftToken](https://rinkeby.etherscan.io/address/0xB0424DFEBA067023D83979864A8cA4640F6B77Fd)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xfF3a11c64AC3e0cF912001327AF4F6EE867C57dC)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0xb5c97E7a54f1969e930E6499Eb7AE2B7c33BA0f0)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0x26E13D1c3D5B081CdFADB025324624753bC06c78)
  - implementation => 0xad4C038f2744a8ab687A7b8fdDfE9DABD3d8fb6c
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x8b1f6EF9126088653A8405Dc33dGK51922aE63904a)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x386B1a1C8Bc6d3Ca3cF66f15f49742a9a2840CA2)
  - implementation => 0x37EFdd23BC3423B31b51D3d8eabfD2B5Cc70E981

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x4a51678cf2c371cbA05F00f7BdDe60634Aa25cf4)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x8C6AA8aeEf01C5Da6E47F910394BE9Ac0e99Ca88)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x88487620a85acd08E05EAe9Ac3100764cfCF711A)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x8793B5B9B8e54D1C5aeD40b679d021ef47c2D20B)
  - implementation => 0x487FD7C7B3869B50BB7e155891cDf8EefA822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x5fF8777B6B8DcA1616891BBCcdecF2aCcc6cF7b8)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0xbb5fc6e4BdD97B11a1CB41C5EE7DE842744BCC9b)
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
