import { config as dotEnvConfig } from "dotenv";
import { ethers } from "ethers";

import * as ABI from "../artifacts/contracts/KeyperPayer.sol/KeyperPayer.json";

dotEnvConfig({ override: true });

const ContractAddress = process.env.CONTRACT_ADDRESS || "";
const KeyperAddress = process.env.KEYPER_ADDRESS || "";
const RpcURL = process.env.RPC_URL || "";

async function main() {
  if (ContractAddress == "") {
    throw "CONTRACT_ADDRESS env variable should be set";
  }
  if (!ethers.isAddress(ContractAddress)) {
    throw "CONTRACT_ADDRESS env variable is not an address";
  }
  if (KeyperAddress == "") {
    throw "KEYPER_ADDRESS env variable should be set";
  }
  if (!ethers.isAddress(KeyperAddress)) {
    throw "KEYPER_ADDRESS env variable is not an address";
  }
  const provider = new ethers.JsonRpcProvider(RpcURL);
  const contract = new ethers.Contract(ContractAddress, ABI.abi, provider);
  const balance = await contract.BalanceOf(KeyperAddress);
  if (balance == BigInt(0)) {
    throw "There is no SPT token found";
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
