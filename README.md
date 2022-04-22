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

- [deployedNftToken](https://etherscan.io/address/0x8C42428a747281B03F10C80e978C107D4d85E37F)
- [vesting](https://etherscan.io/address/0x774c2204D9e50CD9d6A579D194c067360604933f)

  - implementation => 0xC3A7cE08ADBFbfce8b79Bf8d0A6Df16265d1cE3a

- [deployedGkTeamDistributor](https://etherscan.io/address/)
- [deployedGenesisKeyTeamClaim](https://etherscan.io/address/)
  - implementation =>
- [deployedGenesisKey](https://etherscan.io/address/)

  - implementation => x

- [deployedNftGenesisStake](https://etherscan.io/address/)
- [deployedNftProfileHelper](https://etherscan.io/address/)
- [deployedNftProfileProxy](https://etherscan.io/address/)
  - implementation => x
- [deployedNftBuyer](https://etherscan.io/address/)
- [deployedProfileAuctionProxy](https://etherscan.io/address/)

  - implementation => x

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

## Rinkeby

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x6b683aE60483124EDCAd68351Cdb90c697d5Fd9E)
- [vesting](https://rinkeby.etherscan.io/address/0x6466b3a1A6826E97e18083Fe13FD05d9A14C62Fb)

  - implementation => 0xDF3Ef9a0DF7B53eF5FC2679Ba55409989e28069B

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0x03D3A743997c02195A376cB9a6c23459611e8Cb6)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x6aca5606f9418fe663465390BFda47ce3a1aFEC5)
  - implementation => 0x715ac86A4488a90d5B44D49e99176ecb2804698A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x5a889cfed56101A994Ef01b98318EB6e47328703)

  - implementation => 0xFcdb5187182F74fdD1AEA5587D27C6356d1a6531

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x8AD706E4596CAd2458929E6a29270DFc107d5e8b)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x5963b626cec21425051b353C783D3FAC56ED875E)
- [deployedNftProfile](https://rinkeby.etherscan.io/address/0x483d9729c15bd7A4e749F20066235f0D6974eA78)
  - implementation => 0xB2951Fbde1A32B8d0d8C4e9414192d107991239B
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x388c6ba39991F259Db6e85c71Ba2A81205C7025b)
- [deployedProfileAuction](https://rinkeby.etherscan.io/address/0xa7D4dEd902E081c5Cc14e9628252705614bE8906)

  - implementation => 0x45609d078576fe8F10d0073a795d426b2dc02be4

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
