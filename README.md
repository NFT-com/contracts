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

  - implementation => 0x1AB28ab377f3bbbe6EA7871Fffe0d6Cce4208D83

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

- [deployedNftToken](https://rinkeby.etherscan.io/address/0xBB67d85a69FCB6a200439E15e2E2c53Cfb6b0680)
- [vesting](https://rinkeby.etherscan.io/address/0x1DD4121DA7dbA0266726f211BA006210CA111F5E)

  - implementation => 0x2E83F28F8C464A71Cac19d6842A3690EcfD5D6F2

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0xE4B303b917c819b029e9b9ac5bd6d0ec6e7cB0bd)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x798d55538Fcc3c1666b0b28960bCdF38B817eaB4)
  - implementation => 0xc705875032980dce626118a62A2a8a76609ED50D
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x20FC7ad1eE47245F0FEE579E1F4bEb2dC5380068)

  - implementation => 0xa84DFD339fdaC3Ef468Bc73Ea91030F58bD25446

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xca7355Bc1aa2886400f25D82D530cEdEBc362Ae8)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0xD3b1c64F8F5c6b3dc614ccb7E7a754a8A5607Dee)
- [deployedNftProfile](https://rinkeby.etherscan.io/address/0x860Da2aF29a6Ac738246e2fc340Bbf99754C6aAc)
  - implementation => 0x8410c455D8cdE7B46B9c6A223cb84765F054ABeB
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x05f24AD428B99e54EA85fB3D54c34eBd655A195B)
- [deployedProfileAuction](https://rinkeby.etherscan.io/address/0xc49134c613dcF782F4df562A828cf623Eec7ff82)

  - implementation => 0x899591d63be57c070602e66b31B691e04D78Ea32

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
