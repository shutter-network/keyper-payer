import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { toBigInt } from "ethers";
import { ethers } from "hardhat";

describe("KeyperPayer", function () {
  const SUPPLY = ethers.parseEther("100");
  const RATE = toBigInt(2); // 2e-18 tokens per second
  const START_TIMESTAMP = 1704067200;

  async function deployMintableToken() {
    const token = await ethers.deployContract("MintableToken", [SUPPLY]);
    return { token };
  }

  async function deployKeyperPayer() {
    const { token } = await loadFixture(deployMintableToken);
    const [, payer, keyper1, keyper2] = await ethers.getSigners();
    const keypers = [keyper1, keyper2];
    const keyperPayer = await ethers.deployContract("KeyperPayer", [
      await token.getAddress(),
      keypers,
      RATE,
      START_TIMESTAMP,
    ]);
    return { token, keyperPayer, payer, keypers };
  }

  describe("Deployment", function () {
    it("withdraw should fail if there is no balance", async function () {
      const { keyperPayer } = await loadFixture(deployKeyperPayer);
      await expect(keyperPayer.withdraw()).to.be.revertedWith("insufficient balance");
    });
    it("pay should fail if there is no allowance", async function () {
      const { token, keyperPayer, payer } = await loadFixture(deployKeyperPayer);
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "insufficient allowance",
      );
    });
    it("pay should fail if amount is zero", async function () {
      const { token, keyperPayer, payer } = await loadFixture(deployKeyperPayer);
      const amount = BigInt(0);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "amount should be bigger than zero",
      );
    });
    it("pay should fail if keypers.length can not divide amount", async function () {
      const { token, keyperPayer, payer } = await loadFixture(deployKeyperPayer);
      const amount = BigInt(5);
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "amount needs to be divisible by number of keypers",
      );
    });
    it("pay and withdraw", async function () {
      const { token, keyperPayer, payer, keypers } = await loadFixture(deployKeyperPayer);
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await token.connect(payer).approve(keyperPayer, amount);
      await keyperPayer.connect(payer).pay(amount);
      expect(await token.balanceOf(payer)).to.be.equal(0);
      expect(await token.balanceOf(keyperPayer)).to.be.equal(amount);
      expect(await keyperPayer.totalPaid()).to.be.equal(amount);
      expect(await keyperPayer.balanceOf(keypers[1])).to.be.equal(amount / toBigInt(2));
      expect(await keyperPayer.balanceOf(keypers[0])).to.be.equal(amount / toBigInt(2));
      await keyperPayer.connect(keypers[0]).withdraw();
      expect(await keyperPayer.balanceOf(keypers[0])).to.be.equal(0);
      expect(await keyperPayer.totalPaid()).to.be.equal(amount);
    });
    it("pay multiple times", async function () {
      const { token, keyperPayer, payer, keypers } = await loadFixture(deployKeyperPayer);
      const amount1 = ethers.parseEther("1");
      const amount2 = ethers.parseEther("2");
      const totalAmount = amount1 + amount2;
      await token.mint(payer, totalAmount);
      expect(await token.balanceOf(payer)).to.be.equal(totalAmount);
      await token.connect(payer).approve(keyperPayer, totalAmount);
      await keyperPayer.connect(payer).pay(amount1);
      await keyperPayer.connect(payer).pay(amount2);
      expect(await token.balanceOf(payer)).to.be.equal(0);
      expect(await token.balanceOf(keyperPayer)).to.be.equal(totalAmount);
      expect(await keyperPayer.balanceOf(keypers[1])).to.be.equal(totalAmount / toBigInt(2));
      expect(await keyperPayer.balanceOf(keypers[0])).to.be.equal(totalAmount / toBigInt(2));
      await keyperPayer.connect(keypers[0]).withdraw();
      expect(await keyperPayer.balanceOf(keypers[0])).to.be.equal(0);
      expect(await keyperPayer.totalPaid()).to.be.equal(totalAmount);
    });
    it("should check if paid", async function () {
      const { token, keyperPayer, payer } = await loadFixture(deployKeyperPayer);
      expect(await keyperPayer.isPaid()).to.be.false;

      const t0 = (await ethers.provider.getBlock("latest"))!.timestamp;
      const t1 = t0 + 60 * 60 * 24;
      const expectedAmount = RATE * toBigInt(t1 - START_TIMESTAMP);
      await token.mint(payer, expectedAmount);
      await token.connect(payer).approve(keyperPayer, expectedAmount);
      await keyperPayer.connect(payer).pay(expectedAmount);

      await ethers.provider.send("evm_setNextBlockTimestamp", [t1]);
      await ethers.provider.send("evm_mine");
      expect(await keyperPayer.isPaid()).to.be.true;

      await ethers.provider.send("evm_setNextBlockTimestamp", [t1 + 1]);
      await ethers.provider.send("evm_mine");
      expect(await keyperPayer.isPaid()).to.be.false;

      await ethers.provider.send("evm_setNextBlockTimestamp", [t1 + 100]);
      await ethers.provider.send("evm_mine");
      expect(await keyperPayer.isPaid()).to.be.false;
    });
  });
});
