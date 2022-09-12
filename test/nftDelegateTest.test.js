const { expect } = require("chai");
const { convertTinyNumber } = require("./utils/sign-utils");

describe("Nft Delegate Test", function () {
  try {
    let DelegateCallTest, deployedDelegateCallTest;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      DelegateCallTest = await ethers.getContractFactory("DelegateCallTest");
      deployedDelegateCallTest = await DelegateCallTest.deploy();
      await owner.sendTransaction({ to: deployedDelegateCallTest.address, value: convertTinyNumber(100) });
    });

    describe("NFT Delegate Test", async function () {
      it("should test delegate test with null address", async function () {
        const ethBalance = await ethers.provider.getBalance(deployedDelegateCallTest.address);
        await deployedDelegateCallTest.connect(second).testDelegateCall("0x0000000000000000000000000000000000000000");
        const afterEthBalance = await ethers.provider.getBalance(deployedDelegateCallTest.address);
        expect(ethBalance).to.be.equal(afterEthBalance);
        expect(deployedDelegateCallTest.connect(second).testDelegateCall(deployedDelegateCallTest.address)).to.be.reverted;
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
