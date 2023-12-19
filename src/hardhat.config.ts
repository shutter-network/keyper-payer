import "@nomicfoundation/hardhat-toolbox";

import { config as dotEnvConfig } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";

dotEnvConfig({ override: true });

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
// Last hardhat node private key as default
const PRIV_KEY =
  process.env.PRIV_KEY || "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    rpc: {
      url: RPC_URL,
      accounts: [PRIV_KEY],
    },
  },
};

export default config;
