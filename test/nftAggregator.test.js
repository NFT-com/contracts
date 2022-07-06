const { expect } = require("chai");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;


    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(NftAggregator, [], {
        kind: "uups",
      });
    });

    describe("NFT Aggregation", async function () {
      it("should allow nft aggregation", async function () {
        console.log("TBD")
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
