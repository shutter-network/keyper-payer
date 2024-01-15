import { exec } from "child_process";
import { config as dotEnvConfig } from "dotenv";
import { ethers } from "ethers";
import { promisify } from "util";

import * as ABI from "../artifacts/contracts/KeyperPayer.sol/KeyperPayer.json";

const asyncExec = promisify(exec);

dotEnvConfig({ override: true });

const { CONTRACT_ADDRESS = "", RPC_URL = "", UNPAID_COMMAND = "" } = process.env;

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
  validate("RPC_URL", RPC_URL, false);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI.abi, provider);
  const isPaid = await contract.isPaid();
  if (!isPaid) {
    console.error("Keypers are not paid sufficiently.");
    if (UNPAID_COMMAND == "") {
      console.error("UNPAID_COMMAND not specified, exiting.");
    } else {
      try {
        console.error(`Executing UNPAID_COMMAND: ${UNPAID_COMMAND}`);
        const { stdout, stderr } = await asyncExec(UNPAID_COMMAND);
        console.error(`UNPAID_COMMAND executed successfully.`);
        console.error(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      } catch (error) {
        console.error(`Failed to execute unpaid command: ${error}`);
      }
    }
    throw "";
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
