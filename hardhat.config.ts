import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  paths: { tests: "tests" },

  networks: {
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },

  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
