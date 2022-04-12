const { expect } = require("chai");
const { BigNumber } = require("ethers");

const convertNftToken = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

const Schedule = {
  MONTHLY: 0,
  QUARTERLY: 1,
};

describe("NFT Token Staking (Rinkeby)", function () {
  try {
    let NftToken, Vesting;
    let deployedNftToken, deployedVesting;
    let multisig;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      multisig = owner.address;

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy();

      Vesting = await ethers.getContractFactory("Vesting");
      deployedVesting = await hre.upgrades.deployProxy(Vesting, [deployedNftToken.address, multisig], { kind: "uups" });
    });

    it("should allow multisig to initialize vesting", async function () {
      let nftBalance = await deployedNftToken.balanceOf(owner.address);
      console.log("starting nft balance from multisig: ", Number(nftBalance) / 10 ** 18);

      await expect(deployedVesting.connect(owner).claim(owner.address)).to.be.revertedWith(
        "Vesting::claim: recipient not initialized",
      );
      await expect(
        deployedVesting.connect(addr1).initializeVesting([owner.address], [1], [0], [0], [0], [Schedule.MONTHLY]),
      ).to.be.revertedWith("Vesting::onlyMultiSig: Only multisig can call this function");

      await deployedNftToken.approve(deployedVesting.address, convertNftToken(10000000));

      const currentTime1 = Math.floor(new Date().getTime() / 1000);

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address, addr1.address, addr2.address],
            [convertNftToken(1000), convertNftToken(1000), convertNftToken(1000)],
            [currentTime1 - 60 * 60, currentTime1 - 60 * 60, currentTime1 - 60 * 60],
            [currentTime1 - 60 * 60, currentTime1 - 60 * 60, currentTime1 + 60 * 60],
            [currentTime1 + 86400 * 62, currentTime1 + 86400 * 62, currentTime1 + 86400 * 31 * 7],
            [Schedule.MONTHLY, Schedule.MONTHLY, Schedule.QUARTERLY],
          ),
      )
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(owner.address, deployedVesting.address, convertNftToken(3000));

      const currentTime2 = Math.floor(new Date().getTime() / 1000);

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address],
            [convertNftToken(1000)],
            [currentTime2 - 60 * 60],
            [currentTime2 - 60 * 60],
            [currentTime2 + 86400 * 62],
            [Schedule.MONTHLY],
          ),
      ).to.be.revertedWith("Vesting::initializeVesting: recipient already initialized");

      // CLAIM 1
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 31]);

      expect(await deployedVesting.currentClaim(owner.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.currentClaim(addr1.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.currentClaim(addr2.address)).to.equal(convertNftToken(0));
      await deployedVesting.connect(addr1).claim(owner.address);

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(2500));

      let nftBalanceVesting = await deployedNftToken.balanceOf(deployedVesting.address);
      console.log("nftBalanceVesting: ", Number(nftBalanceVesting) / 10 ** 18);

      // CLAIM 2
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 45]);

      expect(await deployedVesting.currentClaim(owner.address)).to.equal(convertNftToken(0));
      expect(await deployedVesting.toBeVested(owner.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.currentClaim(addr1.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.toBeVested(addr1.address)).to.equal(convertNftToken(1000));
      expect(await deployedVesting.currentClaim(addr2.address)).to.equal(convertNftToken(0));
      expect(await deployedVesting.toBeVested(addr2.address)).to.equal(convertNftToken(1000));

      await deployedVesting.connect(addr1).claim(owner.address);

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(2500));

      let nftBalanceVesting2 = await deployedNftToken.balanceOf(deployedVesting.address);
      console.log("nftBalanceVesting2: ", Number(nftBalanceVesting2) / 10 ** 18);

      // CLAIM 3
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 62]);

      expect(await deployedVesting.currentClaim(owner.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.toBeVested(owner.address)).to.equal(convertNftToken(500));
      expect(await deployedVesting.currentClaim(addr1.address)).to.equal(convertNftToken(1000));
      expect(await deployedVesting.toBeVested(addr1.address)).to.equal(convertNftToken(1000));
      expect(await deployedVesting.currentClaim(addr2.address)).to.equal(convertNftToken(0));
      expect(await deployedVesting.toBeVested(addr2.address)).to.equal(convertNftToken(1000));

      await deployedVesting.connect(addr1).claim(owner.address);

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(2000));

      let nftBalanceVesting3 = await deployedNftToken.balanceOf(deployedVesting.address);
      console.log("nftBalanceVesting3: ", Number(nftBalanceVesting3) / 10 ** 18);

      // CLAIM 4
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 93]);

      await deployedVesting.connect(addr1).claim(owner.address);

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(2000));

      let nftBalanceVesting4 = await deployedNftToken.balanceOf(deployedVesting.address);
      console.log("nftBalanceVesting4: ", Number(nftBalanceVesting4) / 10 ** 18);

      // REVOKE?

      await deployedVesting.connect(owner).revokeVesting(owner.address);
      await expect(deployedVesting.connect(owner).revokeVesting(owner.address)).to.be.revertedWith(
        "Vesting::revokeVesting: recipient already revoked",
      );

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(2000));

      await expect(deployedVesting.connect(addr1).claim(owner.address)).to.be.revertedWith(
        "Vesting::claim: recipient already revoked",
      );
      await expect(deployedVesting.connect(owner).claim(owner.address)).to.be.revertedWith(
        "Vesting::claim: recipient already revoked",
      );

      // CLAIM for addr1
      await expect(deployedVesting.connect(addr1).claim(addr1.address))
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(deployedVesting.address, addr1.address, convertNftToken(1000));

      expect(await deployedNftToken.balanceOf(deployedVesting.address)).to.be.equal(convertNftToken(1000));
    });

    it("should allow multisig to initialize vesting and claim all easily", async function () {
      let nftBalance = await deployedNftToken.balanceOf(owner.address);
      console.log("starting nft balance from multisig: ", Number(nftBalance) / 10 ** 18);

      await expect(deployedVesting.connect(owner).claim(owner.address)).to.be.revertedWith(
        "Vesting::claim: recipient not initialized",
      );
      await expect(
        deployedVesting.connect(addr1).initializeVesting([owner.address], [1], [0], [0], [0], [Schedule.MONTHLY]),
      ).to.be.revertedWith("Vesting::onlyMultiSig: Only multisig can call this function");

      await deployedNftToken.approve(deployedVesting.address, convertNftToken(10000000));

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;

      const currentTime1 = timestampBefore;

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address, addr1.address],
            [convertNftToken(1000), convertNftToken(1000)],
            [currentTime1 - 60 * 60, currentTime1 - 60 * 60],
            [currentTime1 - 60 * 60, currentTime1 - 60 * 60],
            [currentTime1 + 86400 * 62, currentTime1 + 86400 * 62],
            [Schedule.MONTHLY, Schedule.MONTHLY],
          ),
      )
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(owner.address, deployedVesting.address, convertNftToken(2000));

      const blockNumBefore2 = await ethers.provider.getBlockNumber();
      const blockBefore2 = await ethers.provider.getBlock(blockNumBefore2);
      const timestampBefore2 = blockBefore2.timestamp;

      const currentTime2 = timestampBefore2;

      await expect(
        deployedVesting
          .connect(owner)
          .initializeVesting(
            [owner.address],
            [convertNftToken(1000)],
            [currentTime2 - 60 * 60],
            [currentTime2 - 60 * 60],
            [currentTime2 + 86400 * 62],
            [Schedule.MONTHLY],
          ),
      ).to.be.revertedWith("Vesting::initializeVesting: recipient already initialized");

      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 31]);
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 45]);

      console.log(
        "nftBalanceVesting 1: ",
        Number(await deployedNftToken.balanceOf(deployedVesting.address)) / 10 ** 18,
      );

      await deployedVesting.connect(addr2).multiClaim([owner.address, addr1.address]);

      console.log(
        "nftBalanceVesting 2: ",
        Number(await deployedNftToken.balanceOf(deployedVesting.address)) / 10 ** 18,
      );

      // CLAIM 3
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 62]);
      await deployedVesting.connect(addr2).multiClaim([owner.address, addr1.address]);

      console.log(
        "nftBalanceVesting 3: ",
        Number(await deployedNftToken.balanceOf(deployedVesting.address)) / 10 ** 18,
      );

      // CLAIM 4
      await network.provider.send("evm_setNextBlockTimestamp", [currentTime1 + 86400 * 93]);
      console.log(
        "nftBalanceVesting 4: ",
        Number(await deployedNftToken.balanceOf(deployedVesting.address)) / 10 ** 18,
      );
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
