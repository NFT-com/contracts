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

export const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  mainnet: 1,
  sepolia: 11155111,
  "optimism-mainnet": 10,
  "polygon-mainnet": 137,
  "polygon-mumbai": 80001,
  "arbitrum-mainnet": 42161,
  "avalanche-mainnet": 43114,
  "avalanche-fuji": 43113,
  bsc: 56,
};

export interface networkType {
  goerli: string;
  mainnet: string;
  "polygon-mainnet": string;
  "polygon-mumbai": string;
  "avalanche-mainnet": string;
  "avalanche-fuji": string;
}

export const chainIdToNetwork = Object.fromEntries(Object.entries(chainIds).map(([key, value]) => [value, key]));

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

function getChainConfigPK(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  return {
    accounts: [`${network === "mainnet" ? mainnetPK : testnetPK}`],
    chainId: chainIds[network],
    url,
    gasPrice: network === "mainnet" ? 10 * 1000000000 : "auto",
  };
}

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case "bsc":
      jsonRpcUrl = "https://bsc-dataseed1.binance.org";
      break;
    default:
      jsonRpcUrl = "https://" + chain + ".infura.io/v3/" + infuraApiKey;
  }

  return {
    accounts: {
      count: 10,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    chainId: chainIds[chain],
    url: jsonRpcUrl,
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
    outputFile: ".gas_snapshot",
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
    arbitrum: getChainConfig("arbitrum-mainnet"),
    "avalanche-mainnet": getChainConfig("avalanche-mainnet"),
    "avalanche-fuji": getChainConfig("avalanche-fuji"),
    bsc: getChainConfig("bsc"),
    optimism: getChainConfig("optimism-mainnet"),
    "polygon-mainnet": getChainConfig("polygon-mainnet"),
    "polygon-mumbai": getChainConfig("polygon-mumbai"),
    mainnet: getChainConfigPK("mainnet"),
    goerli: getChainConfig("goerli"),
    sepolia: getChainConfig("sepolia"),
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      avalanche: process.env.SNOWTRACE_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
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
    version: "0.8.17",
    settings: {
      // viaIR: Boolean(process.env.WITH_IR) || false,
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
      outputSelection: process.env.WITH_IR
        ? {
            "*": {
              "*": ["evm.assembly", "irOptimized"],
            },
          }
        : {},
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
