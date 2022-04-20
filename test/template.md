const { expect } = require("chai");

describe("template", function () {
try {
let Contract;
let deployedContract;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      Contract = await ethers.getContractFactory("Contract");
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      deployedContract = await upgrades.deployProxy(Contract, { kind: "uups" });

      console.log("deployedContract: ", deployedContract.address);
    });

    describe("Initialize Contract", function () {
      console.log("TBD");
    });

} catch (err) {
console.log("error: ", err);
}
});
