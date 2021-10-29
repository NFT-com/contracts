const { expect } = require("chai");

describe("NFT.com Exchange", function () {
  try {
    let NftExchange;
    let deployedNftExchange;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftExchange = await ethers.getContractFactory("NftExchange");
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      deployedNftExchange = await upgrades.deployProxy(NftExchange, { kind: "uups" });

      console.log('deployedNftExchange: ', deployedNftExchange.address);
    });

    describe("Initialize Exchange", function () {
      console.log('TBD');
    });
  } catch (err) {
    console.log("NFT Exchange error: ", err);
  }
});
