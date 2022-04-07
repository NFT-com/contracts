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

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x52E587F6632C1A2C0552FE07e184f7f4920Be5d6)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/)
  - implementation =>
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/)
  - implementation =>

## Rinkeby GK

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0xdf18a3a174076E88eA5B380beb1020CAB9045917)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x655285344f8C70e60d371d1D3FaDBd8BA0f2f2Dd)
  - implementation => 0x05d277DE3642ee03738Be2ce260B2a206Ae43d6A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x9c82765274a69C14d4abd6F75c0275D39F1a80A5)
  - implementation => 0xA0164d065d09A36E112c16015d282DA3Ca3D4275

## Rinkeby Tokens

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x5732b2D8643c94128700a00D6A2398117548041f)
- [vesting](https://rinkeby.etherscan.io/address/0x058069538D35B3037bA373b3CAb9adc8e2388AdF)
  - implementation => 0x0784b4852c3f85d95eb0fd3034b55cc0937fda93
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xbf9FFfC64e6Ec9AB7dA7CE01be7C45F2A32Ba65E)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x9A5858838F4Bb5D3a949289046b26671531b2aF6)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0xbAE022721cfa57024781c3362724D5fBCE7443Da)
  - implementation => 0xf587d350953418bef0088ad62d5a2320e97e3295
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x150D3a845da123eed1a9efB03234bDA030b270Ae)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0x727908a072D469Fd38077Eaa0c16848731040ea0)
  - implementation => 0xc81b3aedfd5d0d28985184200a6826d6cea78ce5

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x7DCd99E98744296441ffdCAaf60E4Ac8407EAe27)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x101D0A2AeE17b229Ce3473F620e740382C253aFa)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0xA33eFdf02F2ef6b65Ad48f7f80Cab1111CCf91FC)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0xA6F03AfB2a99d967bc4CD603c5746D590EDc7136)
  - implementation => 0x487FD7C7B3869B50BB7e155891cDf8EefA822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x2b7193F0a105285243220fD9f2F6C8D4549F4bC0)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0xDcC3C240F73C1Ba1e10e060D98b6dD26fCEC43C7)
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
