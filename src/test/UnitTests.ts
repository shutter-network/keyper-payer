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
      await expect(keyperPayer.connect(payer).Pay(amount)).to.be.revertedWith(
        "keypers should be set",
      );
    });
    it("withdraw should fail if there is no balance", async function () {
      const { keyperPayer } = await loadFixture(deployKeyperPayer);
      await expect(keyperPayer.Withdraw()).to.be.revertedWith("insufficient balance");
    });
    it("pay should fail if there is no allowance", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.SetKeypers([keyper.address, keyper2.address]);
      await expect(keyperPayer.connect(payer).Pay(amount)).to.be.revertedWith(
        "insufficient allowance",
      );
    });
    it("pay and withdraw", async function () {
      const { token, keyperPayer } = await loadFixture(deployKeyperPayer);
      const [, payer, keyper, keyper2] = await ethers.getSigners();
      const amount = ethers.parseEther("1");
      await token.mint(payer, amount);
      expect(await token.balanceOf(payer)).to.be.equal(amount);
      await keyperPayer.SetKeypers([keyper.address, keyper2.address]);
      await token.connect(payer).approve(keyperPayer, amount);
      await keyperPayer.connect(payer).Pay(amount);
      expect(await token.balanceOf(payer)).to.be.equal(0);
      expect(await token.balanceOf(keyperPayer)).to.be.equal(amount);
      expect(await keyperPayer.BalanceOf(keyper2)).to.be.equal(amount / toBigInt(2));
      expect(await keyperPayer.BalanceOf(keyper)).to.be.equal(amount / toBigInt(2));
      await keyperPayer.connect(keyper).Withdraw();
      expect(await keyperPayer.BalanceOf(keyper)).to.be.equal(0);
    });
  });
});
