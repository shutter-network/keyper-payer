import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import * as child from "child_process";
import * as fs from "fs";
import { ethers } from "hardhat";

import type { KeyperPayer, MintableToken } from "../typechain-types";

describe("test scripts", function () {
  async function deployMintableToken() {
    const SUPPLY = ethers.parseEther("100");
    const token = await ethers.deployContract("MintableToken", [SUPPLY]);
    return { token };
  }

  async function deployKeyperPayer() {
    const [, keyper1, keyper2] = await ethers.getSigners();
    const keypers = [keyper1, keyper2];
    const { token } = await loadFixture(deployMintableToken);
    const requestedRate = ethers.toBigInt(2); // 2e-18 tokens per second
    const startTimestamp = 1704067200;
    const keyperPayer = await ethers.deployContract("KeyperPayer", [
      token.target,
      [keyper1.address, keyper2.address],
      requestedRate,
      startTimestamp,
    ]);
    return { token, keyperPayer, keypers, requestedRate, startTimestamp };
  }

  function generateEnvFile(
    tokenAddress: string,
    contractAddress: string,
    keyperAddresses: string[],
    requestedRate: bigint,
    startTimestamp: number,
    unpaidCommand: string = "",
  ) {
    const content =
      `TOKEN_ADDRESS=${tokenAddress}\n` +
      `CONTRACT_ADDRESS=${contractAddress}\n` +
      `KEYPER_ADDRESSES=${keyperAddresses.join(",")}\n` +
      `REQUESTED_RATE=${requestedRate}\n` +
      `START_TIMESTAMP=${startTimestamp}\n` +
      `RPC_URL=http://127.0.0.1:8545\n` +
      `UNPAID_COMMAND=${unpaidCommand}\n`;
    fs.writeFileSync(".env", content);
  }

  describe("deploy", () => {
    let tokenAddress: string;
    let oldEnv: Buffer;
    const keyperAddresses = [
      "0x9A2B8C7D5E6F4a309B1C3d2E5F6a7b809c1D2E3A",
      "0x4F7A2d8b1c5e6F3a9B1c2D3E5F6a2b8c9A2B8C7D",
    ];
    const requestedRate = 100n;
    const startTimestamp = 1704067200;
    before(async () => {
      try {
        oldEnv = fs.readFileSync(".env");
      } catch (error) {
        oldEnv = Buffer.from("");
      }
      const { token } = await loadFixture(deployMintableToken);
      tokenAddress = token.target.toString();
    });
    after(() => {
      fs.writeFileSync(".env", oldEnv);
    });
    it("should fail without token Address", () => {
      generateEnvFile("", "", keyperAddresses, requestedRate, startTimestamp);
      process.env.HARDHAT_NETWORK = "localhost";
      const proc = child.spawnSync("yarn run deploy", [], {
        shell: true,
        cwd: process.cwd(),
        env: process.env,
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("TOKEN_ADDRESS env variable should be set\n"),
      ).to.be.equal(true);
    });
    it("should fail if address is not an address", () => {
      generateEnvFile("0x", "", keyperAddresses, requestedRate, startTimestamp);
      process.env.HARDHAT_NETWORK = "localhost";
      const proc = child.spawnSync("yarn run deploy", [], {
        shell: true,
        cwd: process.cwd(),
        env: process.env,
      });
      expect(proc.status).to.be.equal(1);
      expect(proc.stderr.toString().includes("TOKEN_ADDRESS is not an address\n")).to.be.equal(
        true,
      );
    });
    it("should be successful", () => {
      generateEnvFile(tokenAddress, "", keyperAddresses, requestedRate, startTimestamp);
      process.env.HARDHAT_NETWORK = "localhost";
      const msg = `KeyperPayer deployed to`;
      const proc = child.spawnSync("yarn run deploy", [], {
        shell: true,
        cwd: process.cwd(),
        env: process.env,
      });
      expect(proc.status).to.be.equal(0);
      expect(proc.stdout.toString().includes(msg)).to.be.equal(true);
    });
  });

  describe("paymentTracker", () => {
    let testToken: MintableToken;
    let paymentContract: KeyperPayer;
    let oldEnv: Buffer;
    let rate: bigint;
    before(async () => {
      const { token, keyperPayer, requestedRate } = await loadFixture(deployKeyperPayer);
      testToken = token;
      paymentContract = keyperPayer;
      rate = requestedRate;
      const envContent = fs.readFileSync(".env");
      oldEnv = envContent;
    });
    after(() => {
      fs.writeFileSync(".env", oldEnv);
    });
    it("should fail without contract address", async () => {
      generateEnvFile("", "", [], 0n, 0);
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("CONTRACT_ADDRESS env variable should be set\n"),
      ).to.be.equal(true);
    });
    it("should fail without correct contract address", async () => {
      generateEnvFile("", "0x", [], 0n, 0);
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("CONTRACT_ADDRESS env variable is not an address\n"),
      ).to.be.equal(true);
    });
    it("should fail without payment", async () => {
      generateEnvFile("", paymentContract.target.toString(), [], 0n, 0);
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(proc.stderr.toString().includes("Keypers are not paid sufficiently.")).to.be.equal(
        true,
      );
      expect(
        proc.stderr.toString().includes("UNPAID_COMMAND not specified, exiting."),
      ).to.be.equal(true);
    });
    it("should execute command on failure", async () => {
      generateEnvFile("", paymentContract.target.toString(), [], 0n, 0, "echo testmessage");
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(proc.stderr.toString().includes("UNPAID_COMMAND executed successfully.")).to.be.equal(
        true,
      );
      expect(proc.stderr.toString().includes("stdout: testmessage")).to.be.equal(true);
    });
    it("should success", async () => {
      const [, payer] = await ethers.getSigners();
      const amount = rate * ethers.toBigInt(100 * 365 * 24 * 60 * 60);
      await testToken.mint(payer, amount);
      await testToken.connect(payer).approve(paymentContract, amount);
      await paymentContract.connect(payer).pay(amount);
      generateEnvFile("", paymentContract.target.toString(), [], 0n, 0);
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(0);
    });
  });
});
