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
    const [owner] = await ethers.getSigners();
    const { token } = await loadFixture(deployMintableToken);
    const keyperPayer = await ethers.deployContract("KeyperPayer", [token.target]);
    await keyperPayer.setKeypers([owner]);
    return { token, keyperPayer };
  }

  function generateEnvFile(tokenAddress: string, contractAddress: string, keyperAddress: string) {
    const content = `TOKEN_ADDRESS=${tokenAddress}\nCONTRACT_ADDRESS=${contractAddress}\nKEYPER_ADDRESS=${keyperAddress}\nRPC_URL=http://127.0.0.1:8545`;
    fs.writeFileSync(".env", content);
  }

  describe("deploy", () => {
    let tokenAddress: string;
    let oldEnv: Buffer;
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
      generateEnvFile("", "", "");
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
      generateEnvFile("0x", "", "");
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
      generateEnvFile(tokenAddress, "", "");
      process.env.HARDHAT_NETWORK = "localhost";
      const msg = `KeyperPayer with token ${tokenAddress} deployed to`;
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
    before(async () => {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      testToken = token;
      paymentContract = keyperPayer;
      const envContent = fs.readFileSync(".env");
      oldEnv = envContent;
    });
    after(() => {
      fs.writeFileSync(".env", oldEnv);
    });
    it("should fail without contract address", async () => {
      generateEnvFile(testToken.target.toString(), "", "");
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
      generateEnvFile(testToken.target.toString(), "0x", "");
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("CONTRACT_ADDRESS env variable is not an address\n"),
      ).to.be.equal(true);
    });
    it("should fail without keyper address", async () => {
      generateEnvFile(testToken.target.toString(), paymentContract.target.toString(), "");
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("KEYPER_ADDRESS env variable should be set\n"),
      ).to.be.equal(true);
    });
    it("should fail without correct keyper address", async () => {
      generateEnvFile(testToken.target.toString(), paymentContract.target.toString(), "0x");
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(
        proc.stderr.toString().includes("KEYPER_ADDRESS env variable is not an address\n"),
      ).to.be.equal(true);
    });
    it("should fail without any token", async () => {
      const [keyper] = await ethers.getSigners();

      generateEnvFile(
        testToken.target.toString(),
        paymentContract.target.toString(),
        keyper.address,
      );
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(1);
      expect(proc.stderr.toString().includes("There is no SPT token found\n")).to.be.equal(true);
    });
    it("should success", async () => {
      const [keyper, payer] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await testToken.mint(payer, amount);
      await testToken.connect(payer).approve(paymentContract, amount);
      await paymentContract.connect(payer).pay(amount);
      generateEnvFile(
        testToken.target.toString(),
        paymentContract.target.toString(),
        keyper.address,
      );
      const proc = child.spawnSync("yarn run monitor", [], {
        shell: true,
        cwd: process.cwd(),
      });
      expect(proc.status).to.be.equal(0);
    });
  });
});
