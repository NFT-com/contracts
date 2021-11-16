const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("NFT Profile Helper", function () {
  try {
    let NftProfileHelper;
    let deployedNftProfileHelper;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      NftProfileHelper = await ethers.getContractFactory("NftProfileHelper");
      deployedNftProfileHelper = await NftProfileHelper.deploy();
    });

    it("should allow the owner to add and rmeove @ as a valid char", async function () {
      expect(await deployedNftProfileHelper._validURI("@")).to.be.false;
      await deployedNftProfileHelper.changeAllowedChar("@", true);
      expect(await deployedNftProfileHelper._validURI("@")).to.be.true;

      await deployedNftProfileHelper.changeAllowedChar("@", false);
      expect(await deployedNftProfileHelper._validURI("@")).to.be.false;

      expect(await deployedNftProfileHelper._validURI("a")).to.be.true;
      await deployedNftProfileHelper.changeAllowedChar("a", false);
      expect(await deployedNftProfileHelper._validURI("a")).to.be.false;
    });

    it("should not the owner to add 🚀 as a valid char", async function () {
      expect(await deployedNftProfileHelper._validURI("🚀")).to.be.false;
      await expect(deployedNftProfileHelper.changeAllowedChar("🚀", true)).to.be.reverted;
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
