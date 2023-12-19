import { ethers } from "hardhat";

const TokenAddress = process.env.TOKEN_ADDRESS || "";

async function main() {
  if (TokenAddress == "") {
    throw "TOKEN_ADDRESS env variable should be set";
  }
  if (!ethers.isAddress(TokenAddress)) {
    throw "TOKEN_ADDRESS is not an address";
  }
  const keyperPayerContract = await ethers.deployContract("KeyperPayer", [TokenAddress]);
  await keyperPayerContract.waitForDeployment();

  console.log(`KeyperPayer with token ${TokenAddress} deployed to ${keyperPayerContract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
