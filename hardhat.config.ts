import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "@nomiclabs/hardhat-ethers";
import "hardhat-contract-sizer";

import { BigNumber } from "ethers"

const mnemonic = "comfort mouse tomato excite royal table plunge fog pitch slim tone erase"
console.log("mnemonic: ", mnemonic)

const mnemonicAccounts = {
  mnemonic,
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    ganache: {
      url: "http://localhost:8500",
      accounts: mnemonicAccounts,
      timeout: 60000,
      blockGasLimit: 6000000,
      gasPrice: BigNumber.from(1)
        .mul(10 ** 5)
        .toNumber(),
    },
    bscTest: {
      url: `https://data-seed-prebsc-2-s1.binance.org:8545`,
      accounts: ["0xf94fe93a517bc3b71c386f3eebc37a33031bd33e4199545e8cc59ea8c2e9bc74"],
      timeout: 120000,
      blockGasLimit: 70000,
      gasPrice: BigNumber.from("70000000000").toNumber(),
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/oMe2quVk9K9MOr0Pu0ElEEbxtUe4wkis`,
      accounts: ["0xf94fe93a517bc3b71c386f3eebc37a33031bd33e4199545e8cc59ea8c2e9bc74"],
      timeout: 120000,
      blockGasLimit: 70000,
      gasPrice: BigNumber.from("70000000000").toNumber(),
    },
    poly_test: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/NAxPQ8bpGnnV28VKpSa0bWTHHsHADN12`,
      accounts: [
        "0xf94fe93a517bc3b71c386f3eebc37a33031bd33e4199545e8cc59ea8c2e9bc74",
        "0xa72a6cf74ba30eb2a18dec68d96000d33dd248799466e952529b6d2cefd78a95",
        "0x27ba549e169933b2351b70b4c51f51f7b4065de182ddd7e12b567dddb01d6fbd"
      ],
      timeout: 120000,
      blockGasLimit: 70000,
      gasPrice: BigNumber.from("70000000000").toNumber(),
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
};

export default config;
