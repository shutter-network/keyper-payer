// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract KeyperPayer is Ownable {
  using SafeERC20 for IERC20;

  mapping(address => uint) private balances;
  address[] private keypers;
  address public sptTokenAddress;

  constructor(address tokenAddress) Ownable(msg.sender) {
    sptTokenAddress = tokenAddress;
  }

  function setKeypers(address[] calldata addresses) public onlyOwner {
    keypers = addresses;
  }

  function getKeypers() public view returns (address[] memory) {
    return keypers;
  }

  function pay(uint amount) external {
    require(amount > 0, "amount should be bigger than zero");
    require(keypers.length > 0, "keypers should be set");
    require(amount % keypers.length == 0, "amount can not be shared with keypers");
    uint allowance = IERC20(sptTokenAddress).allowance(msg.sender, address(this));
    require(allowance >= amount, "insufficient allowance");
    IERC20(sptTokenAddress).safeTransferFrom(msg.sender, address(this), amount);
    uint share = amount / keypers.length;

    for (uint i = 0; i < keypers.length; i++) {
      balances[keypers[i]] += share;
    }
  }

  function withdraw() external {
    uint amount = balances[msg.sender];
    require(amount > 0, "insufficient balance");
    balances[msg.sender] = 0;
    IERC20(sptTokenAddress).safeTransfer(msg.sender, amount);
  }

  function balanceOf(address keyperAddress) public view returns (uint) {
    return balances[keyperAddress];
  }
}
