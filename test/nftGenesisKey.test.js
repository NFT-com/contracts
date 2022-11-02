const { expect } = require("chai");

const DECIMALS = 18;

describe("Genesis Key Testing + Auction Mechanics", function () {
  try {
    let GenesisKey;
    let deployedGenesisKey;
    let NftToken;
    let deployedNftToken;
    let NftProfile;
    let deployedNftProfile;
    let ProfileAuction;
    let deployedProfileAuction;
    let deployedWETH;
    let NftProfileHelper;
    let deployedNftProfileHelper;
    let GenesisStake;
    let deployedNftGenesisStake;
    let GenesisKeyTeamClaim;
    let deployedGenesisKeyTeamClaim;
    let GenesisKeyTeamDistributor;

    const auctionSeconds = "604800"; // seconds in 1 week
    const UNI_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    let wethAddress;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await ethers.getContractFactory("NftToken");
      [owner, second, addr1, addr2, ...addrs] = await ethers.getSigners();

      const name = "NFT.com Genesis Key";
      const symbol = "GENESISKEY";
      const multiSig = addr1.address;

      NftProfileHelper = await ethers.getContractFactory("NftProfileHelper");
      deployedNftProfileHelper = await NftProfileHelper.deploy();

      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

      deployedWETH = await NftToken.deploy();
      wethAddress = deployedWETH.address;

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, multiSig, auctionSeconds, false, "ipfs://"],
        { kind: "uups" },
      );

      deployedNftToken = await NftToken.deploy();

      NftProfile = await ethers.getContractFactory("NftProfile");
      deployedNftProfile = await upgrades.deployProxy(
        NftProfile,
        [
          "NFT.com", // string memory name,
          "NFT.com", // string memory symbol,
          "https://api.nft.com/uri/",
        ],
        { kind: "uups" },
      );

      GenesisStake = await ethers.getContractFactory("GenesisNftStake");
      deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKey.address);

      GenesisKeyTeamClaim = await ethers.getContractFactory("GenesisKeyTeamClaim");
      deployedGenesisKeyTeamClaim = await upgrades.deployProxy(GenesisKeyTeamClaim, [deployedGenesisKey.address], {
        kind: "uups",
      });

      GenesisKeyTeamDistributor = await ethers.getContractFactory("GenesisKeyTeamDistributor");
      deployedGkTeamDistributor = await GenesisKeyTeamDistributor.deploy(deployedGenesisKeyTeamClaim.address);

      // only set pause transfer until public sale is over
      await deployedGenesisKey.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);

      NftBuyer = await ethers.getContractFactory("NftBuyer");
      deployedNftBuyer = await NftBuyer.deploy(
        UNI_FACTORY_V2,
        deployedNftGenesisStake.address,
        deployedNftToken.address,
        wethAddress,
      );

      ProfileAuction = await ethers.getContractFactory("ProfileAuction");
      deployedProfileAuction = await upgrades.deployProxy(
        ProfileAuction,
        [deployedNftProfile.address, owner.address, deployedNftProfileHelper.address, deployedGenesisKey.address],
        { kind: "uups" },
      );

      // contract 2 = genesis stake
      await deployedProfileAuction.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);
      await deployedProfileAuction.setUsdc(deployedNftToken.address);
      await deployedProfileAuction.setContract1(deployedNftBuyer.address);
      await deployedProfileAuction.setContract2(deployedNftGenesisStake.address);

      await deployedNftProfile.setProfileAuction(deployedProfileAuction.address);
    });

    describe("Deployment", function () {
      it("deployment should assign the total supply of tokens to the owner", async function () {
        const ownerBalance = await deployedNftToken.balanceOf(owner.address);
        expect(await deployedNftToken.totalSupply()).to.equal(ownerBalance);
      });

      it("user should not be able to send ETH to the contract", async function () {
        const transferAmount = 1;
        await expect(owner.sendTransaction({ to: deployedNftToken.address, value: transferAmount })).to.be.reverted;
      });

      it("should set detailed ERC20 parameters", async function () {
        expect(await deployedNftToken.name()).to.eq("NFT.com");
        expect(await deployedNftToken.symbol()).to.eq("NFT");
        expect(await deployedNftToken.decimals()).to.eq(DECIMALS);
      });

      it("should allow burning NFT.com tokens", async function () {
        const burnAmount = 5;
        await expect(deployedNftToken.connect(owner).burn(burnAmount))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(await owner.getAddress(), ethers.constants.AddressZero, burnAmount);
      });

      it("should allow the owner to set a new owner", async function () {
        expect(await deployedGenesisKey.owner()).to.eq(owner.address);
        await deployedGenesisKey.setOwner(addr1.address);
        expect(await deployedGenesisKey.owner()).to.eq(addr1.address);

        await deployedGenesisKey.connect(addr1).setOwner(owner.address);
        expect(await deployedGenesisKey.owner()).to.eq(owner.address);
      });

      it("should let owner set duration in seconds of public auction", async function () {
        await deployedGenesisKey.setPublicSaleDuration(Number(auctionSeconds) + 100);
        expect(await deployedGenesisKey.publicSaleDurationSeconds()).to.eq(Number(auctionSeconds) + 100);
      });

      it("should allow users to correctly bulk transfer keys they own", async function () {
        await deployedGenesisKey.connect(owner).mintKey(owner.address);
        expect(await deployedGenesisKey.totalSupply()).to.eq(1);
        await deployedGenesisKey.connect(owner).mintKey(owner.address);
        expect(await deployedGenesisKey.totalSupply()).to.eq(2);
        await deployedGenesisKey.connect(owner).mintKey(owner.address);
        expect(await deployedGenesisKey.totalSupply()).to.eq(3);

        expect(await deployedGenesisKey.ownerOf(1)).to.eq(owner.address);
        expect(await deployedGenesisKey.ownerOf(2)).to.eq(owner.address);
        expect(await deployedGenesisKey.ownerOf(3)).to.eq(owner.address);

        await expect(deployedGenesisKey.connect(owner).bulkTransfer([1, 2, 3, 4], addr1.address)).to.be.reverted; // reverts due to token id 4 not existing
        await expect(deployedGenesisKey.connect(owner).bulkTransfer([0, 1, 2], addr1.address)).to.be.reverted; // reverts due to token id 0 not existing
        expect(await deployedGenesisKey.ownerOf(1)).to.eq(owner.address);
        expect(await deployedGenesisKey.ownerOf(2)).to.eq(owner.address);
        expect(await deployedGenesisKey.ownerOf(3)).to.eq(owner.address);
        await deployedGenesisKey.connect(owner).bulkTransfer([1, 2, 3], addr1.address);
        expect(await deployedGenesisKey.ownerOf(1)).to.eq(addr1.address);
        expect(await deployedGenesisKey.ownerOf(2)).to.eq(addr1.address);
        expect(await deployedGenesisKey.ownerOf(3)).to.eq(addr1.address);
      });
    });

    describe("Protocol Upgrades", function () {
      it("should upgrade genesis key contract to V2", async function () {
        const GenesisKeyV2 = await ethers.getContractFactory("GenesisKeyV2");

        let deployedGenesisKeyV2 = await upgrades.upgradeProxy(deployedGenesisKey.address, GenesisKeyV2);

        expect(await deployedGenesisKeyV2.getVariable()).to.be.equal("hello");

        expect(await deployedGenesisKeyV2.testFunction()).to.be.equal(12345);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
