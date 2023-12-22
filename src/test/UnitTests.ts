import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { toBigInt } from "ethers";
import { ethers } from "hardhat";

describe("KeyperPayer", function () {
  async function deployMintableToken() {
    const SUPPLY = ethers.parseEther("100");
    const token = await ethers.deployContract("MintableToken", [SUPPLY]);
    return { token };
  }

  async function deployKeyperPayer() {
    const { token } = await loadFixture(deployMintableToken);
    const keyperPayer = await ethers.deployContract("KeyperPayer", [await token.getAddress()]);
    return { token, keyperPayer };
  }

  describe("Deployment", function () {
    it("pay should fail if there are no keypers set", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "keypers should be set",
      );
    });
    it("withdraw should fail if there is no balance", async function () {
      const { keyperPayer } = await loadFixture(deployKeyperPayer);
      await expect(keyperPayer.withdraw()).to.be.revertedWith("insufficient balance");
    });
    it("pay should fail if there is no allowance", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.setKeypers([keyper.address, keyper2.address]);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "insufficient allowance",
      );
    });
    it("pay should fail if amount is zero", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = BigInt(0);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.setKeypers([keyper.address, keyper2.address]);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "amount should be bigger than zero",
      );
    });
    it("pay should fail if keypers.length can not divide amount", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = BigInt(5);
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.setKeypers([keyper.address, keyper2.address]);
      await expect(keyperPayer.connect(payer).pay(amount)).to.be.revertedWith(
        "amount can not be shared with keypers",
      );
    });
    it("pay and withdraw", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.setKeypers([keyper.address, keyper2.address]);
      await token.connect(payer).approve(keyperPayer, amount);
      await keyperPayer.connect(payer).pay(amount);
      expect(await token.balanceOf(payer)).to.be.equal(0);
      expect(await token.balanceOf(keyperPayer)).to.be.equal(amount);
      expect(await keyperPayer.balanceOf(keyper2)).to.be.equal(amount / toBigInt(2));
      expect(await keyperPayer.balanceOf(keyper)).to.be.equal(amount / toBigInt(2));
      await keyperPayer.connect(keyper).withdraw();
      expect(await keyperPayer.balanceOf(keyper)).to.be.equal(0);
    });
  });
});
