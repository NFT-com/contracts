const { expect } = require("chai");

const DECIMALS = 18;

describe("NFT Gasless Auction V2", function () {
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
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await ethers.getContractFactory("NftToken");
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      let coldWallet = owner.address;

      CreatorBondingCurve = await ethers.getContractFactory("CreatorBondingCurve");
      deployedCreatorBondingCurve = await CreatorBondingCurve.deploy(_numerator, _denominator);

      NftProfileHelper = await ethers.getContractFactory("NftProfileHelper");
      deployedNftProfileHelper = await NftProfileHelper.deploy();

      deployedNftToken = await NftToken.deploy();

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

      ProfileAuction = await ethers.getContractFactory("ProfileAuctionV2");
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
    });

    describe("NFT Profiles", function () {
      it("profiles should have a initial supply of 0", async function () {
        expect(await deployedNftProfile.totalSupply()).to.equal(0);
      });

      it("profile url should be limited to a-z and 0-9", async function () {
        expect(await deployedNftProfileHelper._validURI("abc123")).to.be.true;
        expect(await deployedNftProfileHelper._validURI("abc")).to.be.true;
        expect(await deployedNftProfileHelper._validURI("123")).to.be.true;
        expect(await deployedNftProfileHelper._validURI("Abc")).to.be.false;
        expect(await deployedNftProfileHelper._validURI("!BD")).to.be.false;
        expect(await deployedNftProfileHelper._validURI("abcasddfasdfeeee11231230")).to.be.true;
        expect(await deployedNftProfileHelper._validURI("asdfkjhlkajshdfZZZ")).to.be.false;
        expect(await deployedNftProfileHelper._validURI("🔥🚀💰😂🌕")).to.be.false;
        expect(await deployedNftProfileHelper._validURI("abcdefghijklmnopqrstuvwxyz0123456789*@!")).to.be.false;
        expect(await deployedNftProfileHelper._validURI("abcdefghijklmnopqrstuvwxyz0123456789_")).to.be.true;
      });

      it("profile creation is limited to the nft profile auction contract", async function () {
        await expect(
          deployedNftProfile.createProfile(addr1.address, [
            1000, // tokens
            await ethers.provider.getBlockNumber(), // block bid is minted
            "test", // profile URI
            1000, // block wait
          ]),
        ).to.be.reverted;
      });

      it("minting creator coins should not work without a valid profile", async function () {
        await expect(deployedNftProfile.mintCreatorCoin(1000000, 0,  0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;
      });

      it("burning creator coins should not work without a valid profile", async function () {
        await expect(deployedNftProfile.burnCreatorCoin(1000000, 0,  0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;
      });
    });

    describe("Gasless Bids", async function() {
      it("should allow bid approvals", async function () {
        await expect(deployedProfileAuction.connect(owner).approveBid(
          '10000',
          'helloworld',
          owner.address
        )).to.emit(deployedProfileAuction, "NewBid").withArgs(
          await owner.getAddress(),
          'helloworld',
          '10000'
        );
      });

      it("should allow users to submit a signed signature for a bid", async function () {
        
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});