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
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
};

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC ?? "test test test test test test test test test test test test";
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

// Ensure that we have all the environment variables we need.
const mainnetPK: string | undefined = process.env.MAINNET_PRIVATE_KEY ?? "b1a4373f2a59b540f016383744ef194f7108f0bd11b34bfdaac69e28030a35e7";
if (!mainnetPK) {
  throw new Error("Please set your MAINNET_PRIVATE_KEY in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY ?? "460ed70fa7394604a709b7dff23f1641";
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

const alchemyApiKey: string | undefined = process.env.ALCHEMY_API_KEY ?? "_H3tl1xfDKddnitmisPE4_0trJiEEaG4";
if (!infuraApiKey) {
  throw new Error("Please set your ALCHEMY_API_KEY in a .env file");
}

function getChainConfigPK(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  return {
    accounts: [`${mainnetPK}`],
    chainId: chainIds[network],
    url,
    gasPrice: 28 * 1000000000,
  };
}

function getChainConfig(network: keyof typeof chainIds): NetworkUserConfig {
  const url: string = `https://eth-rinkeby.alchemyapi.io/v2/${alchemyApiKey}`; // "https://" + network + ".infura.io/v3/" + infuraApiKey;
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
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        // url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      },
      accounts: {
        mnemonic,
      },
      chainId: chainIds.hardhat,
    },
    mainnet: getChainConfigPK("mainnet"),
    goerli: getChainConfig("goerli"),
    kovan: getChainConfig("kovan"),
    rinkeby: getChainConfig("rinkeby"),
    ropsten: getChainConfig("ropsten"),
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
