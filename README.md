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
- [vesting](https://etherscan.io/address/0xE13d298F713bFFd40D011e577AeBE7F31260E5Fa)

  - implementation => 0xbC0F959867730b017BdB46BAE1D203A7a3d9518B

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

- [deployedNftToken](https://rinkeby.etherscan.io/address/0x4aA4Cd36e21dCc2247b5FB5e30ED4D5808f7ECc1)
- [vesting](https://rinkeby.etherscan.io/address/0x37eb4cb864d63735794ed7cD16550A7C6EDdcbB3)

  - implementation => 0x43e6465C8692a82AFEF8569211042919dF6bcBd5

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0xaE8F59CC5294Ad07a135eB39D361512aA9DaCb89)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x46b7f6864cD071845de69ce7E9D82EDBBDc7054F)
  - implementation => 0x05d277DE3642ee03738Be2ce260B2a206Ae43d6A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x8cE66A6Bb03Fb407D9E9D8327e266e54058d7362)

  - implementation => 0x3FEB00D0784d720E995a5782325aE609E24bf4D1

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0x7C056980e27AE75D01052C21cb598f368e01DE59)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x82A4CB974150bEf18c138a9C935C6960D21f7D34)
- [deployedNftProfile](https://rinkeby.etherscan.io/address/0xd7Fd5046a2523841Ee840d7574B54591300bAcB6)
  - implementation => 0x95de8d9aaE3BA7Fd4322d9b7c9C4511901c14fa0
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x5396fEFC0179DE69Fb8d7F43cEa495927713Ca37)
- [deployedProfileAuction](https://rinkeby.etherscan.io/address/0xbc6BA73F5822abff07F6BABa7617E78a6C0729c6)

  - implementation => 0x8C03BF718b02F7C843c484c613eb72c0FaCE6aC0

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0xb290FfddB496F05cCC115629055967b9C4D4E0E0)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x6Da281301f7b4506ea1F7495ae9415348dA475cC)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0x709D9970c45dED0F9D5F3FdB0b08BE4134552dB6)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x10CF5F4C7cEeBb483A64E9500816f7356dC9379a)
  - implementation => 0x9B0aB7a56486E6ed12ad22Ce29a657B7268B77B4
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x0Fae273409Ad108692d6515dd134A338364f1689)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0x4dCF39912385A00ed722ce0b70A21d616eA6BAEC)
  - implementation => 0x9a47cFd45718dB5BEEA2aA200BE50E157023469c

## Rinkeby Version 2

- [deployedNftToken](https://rinkeby.etherscan.io/address/0xa40E1cc652ED0Bfeae2231ABAAAa8551f62560f0)
- [vesting](https://rinkeby.etherscan.io/address/0xBaa623C1876f918982599C215D6Eb4Fd8480a130)

  - implementation => 0x43e6465C8692a82AFEF8569211042919dF6bcBd5

- [deployedGkTeamDistributor](https://rinkeby.etherscan.io/address/0xAF8779E2a299ed59088B93d8b029d07bFC3c5dDa)
- [deployedGenesisKeyTeamClaim](https://rinkeby.etherscan.io/address/0x4a096ddF693c45d67eC625c8C0c16CCD2c388C50)
  - implementation => 0x05d277DE3642ee03738Be2ce260B2a206Ae43d6A
- [deployedGenesisKey](https://rinkeby.etherscan.io/address/0x7B4517C94301223D2bFC009E4FCeCA2Cb0F54b23)

  - implementation => 0x3FEB00D0784d720E995a5782325aE609E24bf4D1

- [deployedNftGenesisStake](https://rinkeby.etherscan.io/address/0xdAFCB481D8f6d08AC1952ff4d00b9BF014156958)
- [deployedNftProfileHelper](https://rinkeby.etherscan.io/address/0x887DFeC8EDb1533557C53F2A1e237341Ea1AC06B)
- [deployedNftProfile](https://rinkeby.etherscan.io/address/0xb6465bA958C768b4153DB0b43967335ca5ab5cC5)
  - implementation => 0x95de8d9aaE3BA7Fd4322d9b7c9C4511901c14fa0
- [deployedNftBuyer](https://rinkeby.etherscan.io/address/0x1823c26FC21f124BB61256420000C3B531BF1D40)
- [deployedProfileAuction](https://rinkeby.etherscan.io/address/0x7033C867fB817aD7F0B56DE09fc084f3Ea3aA7EE)

  - implementation => 0x8C03BF718b02F7C843c484c613eb72c0FaCE6aC0

- [nftTransferProxy](https://rinkeby.etherscan.io/address/0x5B64d7433A59a71130a53A50Fe96358EF29B2F6F)
  - implementation => 0xDfA0914E53b3C222fCBf67cD3cD89474e7B63bef
- [deployedERC20TransferProxy](https://rinkeby.etherscan.io/address/0x8A8b722B8966E479E820612359875b17202518c6)
  - implementation => 0xFecF248854c3A4e36A37CE04e7f025F718873509
- [deployedCryptoKittyTransferProxy](https://rinkeby.etherscan.io/address/0xCA781eBb142e7c67a0334c0C1dA1FFe9688001FC)
  - implementation => 0x67A59654E2ec02f12fbbcb6A2A758c7aB7c2c8E5
- [deployedValidationLogic](https://rinkeby.etherscan.io/address/0x4259444450E25a9341853F6F19167d1fc0B280ED)
  - implementation => 0x9B0aB7a56486E6ed12ad22Ce29a657B7268B77B4
- [deployedMarketplaceEvent](https://rinkeby.etherscan.io/address/0x2f367496fa82832FB3EEf42D594E3D20BBC3c52D)
  - implementation => 0xDdE3E8BeEb4aE8345df3a3B9aB524979bD9f8463
- [deployedNftMarketplace](https://rinkeby.etherscan.io/address/0xe539C5Fd406889469860E5AF9c0b336B5fa53E8F)
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
