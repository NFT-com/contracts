import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "@nomiclabs/hardhat-web3";
import "@openzeppelin/hardhat-upgrades";

import "./tasks/accounts";
import "./tasks/clean";
import "./tasks/deployers";

import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  mainnet: 1,
  sepolia: 11155111
};

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

// Ensure that we have all the environment variables we need.
const mainnetPK: string | undefined = process.env.MAINNET_PRIVATE_KEY;
if (!mainnetPK) {
  throw new Error("Please set your MAINNET_PRIVATE_KEY in a .env file");
}

const testnetPK: string | undefined = process.env.TESTNET_PRIVATE_KEY;
if (!testnetPK) {
  throw new Error("Please set your TESTNET_PRIVATE_KEY in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

const alchemyApiKey: string | undefined = process.env.ALCHEMY_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your ALCHEMY_API_KEY in a .env file");
}

function getChainConfigPK(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  return {
    accounts: [`${network === "mainnet" ? mainnetPK : testnetPK}`],
    chainId: chainIds[network],
    url,
    gasPrice: network === "mainnet" ? 11 * 1000000000 : "auto",
  };
}

function getChainConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = `https://eth-${network}.alchemyapi.io/v2/${alchemyApiKey}`;
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API,
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: ["./contracts/test/NftProfileV2a.sol"],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      },
      accounts: {
        mnemonic,
      },
      chainId: chainIds.goerli,
    },
    mainnet: getChainConfigPK("mainnet"),
    goerli: getChainConfig("goerli"),
    sepolia: getChainConfig("sepolia"),
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    timeout: 1000000,
  },
  solidity: {
    version: "0.8.6",
    settings: {
      // viaIR: true,
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 0,
      },
      // outputSelection: {
      //   "*": {
      //     "*": ["evm.assembly", "irOptimized"]
      //   }
      // }
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
