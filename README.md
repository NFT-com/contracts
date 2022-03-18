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

- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0xbEeB7221B6058B9529e0bde13A072f17c63CD372)
  - implementation => 0xe190Dde27bed3aB6cBcF62E155aA485D1228520F
- [deployedNftToken](https://rinkeby.etherscan.io/address/0x0F38751eA1bD10B373Cf9f61794426a251f43f99)
- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x3C35A978826A49Fb276357bFE0C489eD32940CCa)
- [deployedPublicStake](https://rinkeby.etherscan.io/address/0xbC956A5a1B1E47d44F5c9F66fdfF9C61f2b19BD1)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x53055289B76640fb00bD2E9C63b3974810744B3E)
- [deployedNftProfileProxy](https://rinkeby.etherscan.io/address/0xaa7F30a10D3E259ae9B14308C77dFe5aA2f5D9Df)
  - implementation => 0xd60fb4F9fd51eC20402625Ea39494b28111b4Ed3
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0xce04Ee11831899784598b221249C6609D8D8322F)
- [deployedProfileAuctionProxy](https://rinkeby.etherscan.io/address/0xc53884b5E8B9f29635D865FBBccFd7Baf103B6eC)
  - implementation => 0x771802dDc03173D0284ee7B046cf02A6e802F5cc

## Rinkeby Marketplace

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x2302004af147967a99449d36e12B4831Af99b23E)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0xAF09BE1A161E85808199000269c252267c15690E)
  - implementation => 0xfecf248854c3a4e36a37ce04e7f025f718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x20D02512FaAa170cB553E7B469af2a05856ef77C)
  - implementation => 0x67a59654e2ec02f12fbbcb6a2a758c7ab7c2c8e5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0xce789D5C9DfDdEBA2AA87b37f2dE25e26a767023)
  - implementation => 0x487fd7c7b3869b50bb7e155891cdf8eefa822f13
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x8D42A1Af22ac1287aabFEb5D7BEEa956210Cf197)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0xC6F83d1D6D5a2aC7EE034483F8Ebe29646467Db7)
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
