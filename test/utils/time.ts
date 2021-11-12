import { BigNumber } from "ethers";
import { ethers } from "hardhat";

async function advanceBlock() {
  await ethers.provider.send("evm_mine", []);
}

async function advanceBlockTo(blockNumber: number) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock();
  }
}

async function increase(value: number) {
  await ethers.provider.send("evm_increaseTime", [value]);
  await advanceBlock();
}

async function latest() {
  const block = await ethers.provider.getBlock("latest");
  return BigNumber.from(block.timestamp);
}

async function advanceTimeAndBlock(time: number) {
  await advanceTime(time);
  await advanceBlock();
}

async function advanceTime(time: number) {
  await ethers.provider.send("evm_increaseTime", [time]);
}

const duration = {
  seconds: function (val: string) {
    return BigNumber.from(val);
  },
  minutes: function (val: string) {
    return BigNumber.from(val).mul(this.seconds("60"));
  },
  hours: function (val: string) {
    return BigNumber.from(val).mul(this.minutes("60"));
  },
  days: function (val: string) {
    return BigNumber.from(val).mul(this.hours("24"));
  },
  weeks: function (val: string) {
    return BigNumber.from(val).mul(this.days("7"));
  },
  years: function (val: string) {
    return BigNumber.from(val).mul(this.days("365"));
  },
};

module.exports = {
  advanceBlockTo,
  advanceBlock,
  increase,
  latest,
  advanceTimeAndBlock,
  advanceTime,
  duration,
};
