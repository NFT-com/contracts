const { expect } = require("chai");

// used because the bonding curve doesn't work well with small uint256
// * 10000 for larger magnitude
const c = input => input * 10000;

describe("NFT.com", function () {
  try {
    let NftToken;
    let deployedNftToken;
    let NftProfile;
    let deployedNftProfile;
    let ProfileAuction;
    let deployedProfileAuction;
    let CreatorBondingCurve;
    let deployedCreatorBondingCurve;
    let _numerator = 1;
    let _denominator = 1000000;
    let NftProfileHelper;
    let deployedNftProfileHelper;
    let CreatorCoin;
    let deployedCreatorCoin;
    let coldWallet;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await ethers.getContractFactory("NftTokenV1");
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      coldWallet = owner.address;

      CreatorBondingCurve = await ethers.getContractFactory("CreatorBondingCurve");
      deployedCreatorBondingCurve = await CreatorBondingCurve.deploy(_numerator, _denominator);

      NftProfileHelper = await ethers.getContractFactory("NftProfileHelper");
      deployedNftProfileHelper = await NftProfileHelper.deploy();

      deployedNftToken = await upgrades.deployProxy(NftToken, { kind: "uups" });

      NftProfile = await ethers.getContractFactory("NftProfileV1");
      deployedNftProfile = await upgrades.deployProxy(
        NftProfile,
        [
          "NFT.com", // string memory name,
          "NFT.com", // string memory symbol,
          deployedNftToken.address, // address _nftCashAddress,
          deployedCreatorBondingCurve.address // deployedCreatorBondingCurve address
        ],
        { kind: "uups" },
      );

      ProfileAuction = await ethers.getContractFactory("ProfileAuctionV1");
      deployedProfileAuction = await upgrades.deployProxy(
        ProfileAuction,
        [
          deployedNftToken.address,
          owner.address,
          deployedNftProfile.address,
          owner.address,
          deployedNftProfileHelper.address,
          coldWallet,
        ],
        { kind: "uups" },
      );

      deployedNftProfile.setProfileAuction(deployedProfileAuction.address);

      // creator coin logic
      await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, c(2500000));

      await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
        .to.emit(deployedProfileAuction, "NewBid")
        .withArgs(owner.address, "george", 10000);

      expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(10000);

      expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

      expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

      await deployedProfileAuction.connect(owner).claimProfile("george", { value: "500000000000000000" });

      expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(0);

      expect(await deployedNftProfile.totalSupply()).to.be.equal(1);

      await deployedNftProfile.initializeCreatorCoin(0);
      await deployedNftToken.connect(owner).approve(await deployedNftProfile.creatorCoin(0), c(2500000));

      CreatorCoin = await ethers.getContractFactory("CreatorCoin");
      deployedCreatorCoin = await CreatorCoin.attach(await deployedNftProfile.creatorCoin(0));

      await deployedCreatorCoin.connect(owner).approve(deployedNftProfile.address, c(2500000));
      await deployedNftToken.connect(owner).approve(deployedNftProfile.address, c(2500000));
    });

    describe("Creator Coins", function () {
      it("should not allow burning of insufficient creator coin", async function () {
        await expect(deployedNftProfile.burnCreatorCoin(c(1), 0)).to.be.reverted;
      });

      it("should mint and burn along bonding curve for profile and allocate fees, and allow rewards to user who staked", async function () {
        expect(await deployedNftToken.balanceOf(deployedCreatorCoin.address)).to.be.equal(0);

        await expect(deployedNftProfile.connect(owner).mintCreatorCoin(c(100), 0)).to.emit(deployedNftToken, "Transfer")
        .withArgs(
          deployedCreatorCoin.address,
          ethers.constants.AddressZero,
          c(100) * 0.02
        );

        expect(await deployedCreatorCoin.fees(owner.address)).to.be.equal(c(100) * 0.1); // fee is 10%

        expect(await deployedNftToken.balanceOf(deployedCreatorCoin.address)).to.be.equal(c(98));

        await expect(deployedCreatorCoin.connect(owner).redeemFees())
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(deployedCreatorCoin.address, owner.address, c(100) * 0.1);

        // 0 fees after
        expect(await deployedCreatorCoin.fees(owner.address)).to.be.equal(0);

        expect(await deployedNftToken.balanceOf(deployedCreatorCoin.address)).to.be.equal(c(100) * 0.88); // should have 10% + 2% gone since just claimed

        // ok
        let creatorCoinToBurn = 96000;
        let nftTokensReleased = Number(
          await deployedCreatorBondingCurve.getPrice(0, deployedCreatorCoin.address, creatorCoinToBurn),
        );

        // get total supply creator coin
        let preSupply = await deployedCreatorCoin.totalSupply();

        await expect(deployedNftProfile.connect(owner).burnCreatorCoin(creatorCoinToBurn, 0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(deployedCreatorCoin.address, ethers.constants.AddressZero, Math.trunc(nftTokensReleased * 0.02));

        let postSupply = await deployedCreatorCoin.totalSupply();

        await expect(Number(preSupply) - Number(postSupply)).to.be.equal(96000); // burn 96000 creator coin

        expect(await deployedCreatorCoin.fees(owner.address)).to.be.equal(Math.trunc(nftTokensReleased * 0.1)); // fee is 10%

        await expect(deployedCreatorCoin.connect(owner).redeemFees())
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(deployedCreatorCoin.address, owner.address, Math.trunc(nftTokensReleased * 0.1));

        // 0 fees after
        expect(await deployedCreatorCoin.fees(owner.address)).to.be.equal(0);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
