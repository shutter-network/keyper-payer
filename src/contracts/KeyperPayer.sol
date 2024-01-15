// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract KeyperPayer {
  using SafeERC20 for IERC20;

  mapping(address => uint) private balances;
  uint256 public totalPaid;
  uint256 public startTimestamp;
  address[] private keypers;
  address public sptTokenAddress;
  uint256 public requestedRate; // tokens per second

  constructor(address _sptTokenAddress, address[] memory _keypers, uint256 _requestedRate, uint256 _startTimestamp) {
    require(_keypers.length > 0);
    sptTokenAddress = _sptTokenAddress;
    requestedRate = _requestedRate;
    keypers = _keypers;
    startTimestamp = _startTimestamp;
  }

  function getKeypers() public view returns (address[] memory) {
    return keypers;
  }

  function pay(uint amount) external {
    require(amount > 0, "amount should be bigger than zero");
    require(amount % keypers.length == 0, "amount needs to be divisible by number of keypers");
    uint allowance = IERC20(sptTokenAddress).allowance(msg.sender, address(this));
    require(allowance >= amount, "insufficient allowance");
    IERC20(sptTokenAddress).safeTransferFrom(msg.sender, address(this), amount);
    uint share = amount / keypers.length;

    for (uint i = 0; i < keypers.length; i++) {
      balances[keypers[i]] += share;
    }
    totalPaid += amount;
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

  function isPaid() public view returns (bool) {
      if (block.timestamp < startTimestamp) {
          return true;
      }
      uint256 dt = block.timestamp - startTimestamp;
      uint256 minPaid = requestedRate * dt;
      return totalPaid >= minPaid;
  }
}
