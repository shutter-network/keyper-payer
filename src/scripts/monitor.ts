import { config as dotEnvConfig } from "dotenv";
import { ethers } from "ethers";

import * as ABI from "../artifacts/contracts/KeyperPayer.sol/KeyperPayer.json";

dotEnvConfig({ override: true });

const { CONTRACT_ADDRESS = "", KEYPER_ADDRESS = "", RPC_URL = "" } = process.env;

function validate(name: string, value: string, validateValue: boolean = true) {
  if (!value) {
    throw `${name} env variable should be set`;
  }
  if (!ethers.isAddress(value) && validateValue) {
    throw `${name} env variable is not an address`;
  }
}

async function main() {
  validate("CONTRACT_ADDRESS", CONTRACT_ADDRESS);
  validate("KEYPER_ADDRESS", KEYPER_ADDRESS);
  validate("RPC_URL", RPC_URL, false);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);
  const balance = await contract.balanceOf(KEYPER_ADDRESS);
  if (balance == BigInt(0)) {
    throw "There is no SPT token found";
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
