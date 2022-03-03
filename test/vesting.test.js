const { expect } = require("chai");
const { BigNumber } = require("ethers");

const convertNftToken = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

describe("NFT Token Staking (Rinkeby)", function () {
  try {
    let NftToken, Vesting;
    let deployedNftToken, deployedVesting;
    let multisig;
    const NFT_RINKEBY_ADDRESS = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      multisig = owner.address;

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.attach(NFT_RINKEBY_ADDRESS);

      Vesting = await ethers.getContractFactory("Vesting");
      deployedVesting = await Vesting.deploy(NFT_RINKEBY_ADDRESS, multisig);
    });

    it("should allow multisig to initialize vesting", async function () {
      let nftBalance = await deployedNftToken.balanceOf(owner.address);
      console.log("starting nft balance from multisig: ", Number(nftBalance) / 10 ** 18);

      await expect(deployedVesting.connect(owner).claim(owner.address)).to.be.revertedWith(
        "Vesting::claim: recipient not initialized",
      );
      await expect(
        deployedVesting.connect(addr1).initializeVesting([owner.address], [1], [0], [0], [0]),
      ).to.be.revertedWith("Vesting::onlyMultiSig: Only multisig can call this function");

      await deployedNftToken.approve(deployedVesting.address, convertNftToken(10000000));

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address],
            [convertNftToken(1000)],
            [Math.floor(new Date().getTime() / 1000) - 60 * 60],
            [Math.floor(new Date().getTime() / 1000) - 60 * 60],
            [Math.floor(new Date().getTime() / 1000) + 60 * 60 * 7],
          ),
      )
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(owner.address, deployedVesting.address, convertNftToken(1000));

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address],
            [convertNftToken(1000)],
            [Math.floor(new Date().getTime() / 1000) - 60 * 60],
            [Math.floor(new Date().getTime() / 1000) - 60 * 60],
            [Math.floor(new Date().getTime() / 1000) + 60 * 60 * 7],
          ),
      ).to.be.revertedWith("Vesting::initializeVesting: recipient already initialized");

      await deployedVesting.connect(addr1).claim(owner.address);

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.lt(convertNftToken(1000));

      let nftBalanceVesting = await deployedNftToken.balanceOf(deployedVesting.address);
      console.log('nftBalanceVesting: ', Number(nftBalanceVesting) / 10 ** 18);

      await deployedVesting.connect(owner).revokeVesting(owner.address);
      await expect(deployedVesting.connect(owner).revokeVesting(owner.address)).to.be.revertedWith("Vesting::revokeVesting: recipient already revoked");

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(0);

      await expect(deployedVesting.connect(addr1).claim(owner.address)).to.be.revertedWith("Vesting::claim: recipient already revoked");
      await expect(deployedVesting.connect(owner).claim(owner.address)).to.be.revertedWith("Vesting::claim: recipient already revoked");
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
