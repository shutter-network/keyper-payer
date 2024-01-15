import { ethers } from "hardhat";

const tokenAddressEnv = process.env.TOKEN_ADDRESS || "";
const keyperAddressesEnv = process.env.KEYPER_ADDRESSES || "";
const requestedRateEnv = process.env.REQUESTED_RATE || "";
const startTimestampEnv = process.env.START_TIMESTAMP || "";

function validateInt(name: string, value: string): bigint {
  if (value == "") {
    throw `${name} env variable should be set`;
  }
  try {
    return BigInt(value);
  } catch {
    throw `${name} should be a decimal integer`;
  }
}

function validateAddress(name: string, value: string): string {
  if (!value) {
    throw `${name} env variable should be set`;
  }
  if (!ethers.isAddress(value)) {
    throw `${name} is not an address`;
  }
  return ethers.getAddress(value);
}

function validateAddresses(name: string, value: string): string[] {
  if (!value) {
    throw `${name} env variable should be set`;
  }
  const addressStrs = value.split(",");
  if (addressStrs.length == 0) {
    throw `${name} is not a comma serparated list of addresses`;
  }
  const addresses = [];
  for (const addressStr of addressStrs) {
    if (!ethers.isAddress(addressStr)) {
      throw `${name} is not a comma separated list of addresses`;
    }
    addresses.push(ethers.getAddress(addressStr));
  }

  return addresses;
}

async function main() {
  const tokenAddress = validateAddress("TOKEN_ADDRESS", tokenAddressEnv);
  const keyperAddresses = validateAddresses("KEYPER_ADDRESSES", keyperAddressesEnv);
  const requestedRate = validateInt("REQUESTED_RATE", requestedRateEnv);
  const startTimestamp = validateInt("START_TIMESTAMP", startTimestampEnv);

  const keyperPayerContract = await ethers.deployContract("KeyperPayer", [
    tokenAddress,
    keyperAddresses,
    requestedRate,
    startTimestamp,
  ]);
  await keyperPayerContract.waitForDeployment();
  console.log(
    `KeyperPayer deployed to ${keyperPayerContract.target}.` +
      `\n tokenAddress: ${tokenAddress},` +
      `\n keyperAddresses: ${keyperAddresses},` +
      `\n requestedRate: ${requestedRate},` +
      `\n startTimestamp: ${startTimestamp}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
