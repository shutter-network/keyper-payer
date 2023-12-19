import "@nomicfoundation/hardhat-toolbox";

import { config as dotEnvConfig } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

dotEnvConfig({ override: true });

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const PRIV_KEY = process.env.PRIV_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

if (PRIV_KEY !== undefined) {
  config.networks = {
    rpc: {
      url: RPC_URL,
      accounts: [PRIV_KEY],
    },
  };
}

export default config;
