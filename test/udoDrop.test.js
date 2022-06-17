const { expect } = require("chai");

describe("Udo One Off NFT Drop (Rinkeby)", function () {
  try {
    let UdoDrop;
    let deployedUdoDrop;
    let baseURI = "ipfs://QmP7gYT2WhsN7Hi1bMkxMfm71Dd2aNS6RL8sERnNgCrjiZ/";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      UdoDrop = await ethers.getContractFactory("UdoDrop");
      deployedUdoDrop = await UdoDrop.deploy(baseURI);
    });

    it("should deploy an initial version of UdoDrop", async function () {
      expect(await deployedUdoDrop.totalSupply()).to.be.equal(3);
      expect(await deployedUdoDrop.tokenURI(0)).to.be.equal(`${baseURI}0`);
      expect(await deployedUdoDrop.tokenURI(1)).to.be.equal(`${baseURI}1`);
      expect(await deployedUdoDrop.tokenURI(2)).to.be.equal(`${baseURI}2`);
      await expect(deployedUdoDrop.tokenURI(3)).to.be.reverted;
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
