const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { advanceBlock } = require("./utils/time");
const { sign, getDigest, getHash, convertToHash, ERC20_PERMIT_TYPEHASH, BID_TYPEHASH } = require("./utils/sign-utils");

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
    let profileFeeWei = "100000000000000000"; // 0.1 ETH
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

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
          deployedCreatorBondingCurve.address, // deployedCreatorBondingCurve address
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
        await expect(deployedNftProfile.mintCreatorCoin(1000000, 0, 0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;
      });

      it("burning creator coins should not work without a valid profile", async function () {
        await expect(deployedNftProfile.burnCreatorCoin(1000000, 0, 0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;
      });
    });

    describe("Gasless Bids", async function () {
      it("should allow bid approvals", async function () {
        await expect(deployedProfileAuction.connect(owner).approveBid("10000", "helloworld", owner.address))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(await owner.getAddress(), "helloworld", "10000");
      });

      it("should allow users to submit a signed signature for a bid", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        // permit NFT tokens
        const nftTokenPermitDigest = await getDigest(
          ethers.provider,
          "NFT.com",
          deployedNftToken.address,
          getHash(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedProfileAuction.address, MAX_UINT, 0, MAX_UINT],
          ),
        );

        // domain separator V4
        const nftProfileBid = await getDigest(
          ethers.provider,
          "NFT.com Domain Auction",
          deployedProfileAuction.address,
          getHash(
            ["bytes32", "uint256", "string", "address"],
            [BID_TYPEHASH, BigNumber.from(10000), "satoshi", ownerSigner.address],
          ),
        );

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
        expect(await deployedNftToken.allowance(ownerSigner.address, deployedProfileAuction.address)).to.be.equal(0);

        const { v: nftV, r: nftR, s: nftS } = sign(nftTokenPermitDigest, ownerSigner);
        const { v: v0, r: r0, s: s0 } = sign(nftProfileBid, ownerSigner);

        await expect(
          deployedProfileAuction
            .connect(owner)
            .mintProfileFor(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, nftV, nftR, nftS),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(ownerSigner.address, deployedProfileAuction.address, 10000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        // make sure profile can be claimed
        await deployedProfileAuction
          .connect(owner)
          .claimProfile(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });
    });

    it("should hit edge functions", async function () {
      await deployedProfileAuction.setProfileFee(0);

      await deployedProfileAuction.setOwner(owner.address);

      expect(
        await deployedProfileAuction.validateBid(
          0,
          "test",
          owner.address,
          28,
          "0x8fbf2bcdc98d8ceea20e2c9e6c3237ff9d8536a813a7166b5a5ce4411eee9fb9",
          "0x2a6cb9a6e2a74fd3b3689b34e004c8b6bb65a83f79ce617af2d4befbe26ac6fe",
        ),
      ).to.be.false;

      await deployedProfileAuction.approveBid(1, "test", owner.address);

      expect(
        await deployedProfileAuction.validateBid(
          1,
          "test",
          owner.address,
          28,
          "0x8fbf2bcdc98d8ceea20e2c9e6c3237ff9d8536a813a7166b5a5ce4411eee9fb9",
          "0x2a6cb9a6e2a74fd3b3689b34e004c8b6bb65a83f79ce617af2d4befbe26ac6fe",
        ),
      ).to.be.true;

      expect(
        await deployedProfileAuction.validateBid(
          1,
          "test2",
          owner.address,
          28,
          "0x8fbf2bcdc98d8ceea20e2c9e6c3237ff9d8536a813a7166b5a5ce4411eee9fb9",
          "0x2a6cb9a6e2a74fd3b3689b34e004c8b6bb65a83f79ce617af2d4befbe26ac6fe",
        ),
      ).to.be.false;
    });

    it("should allow a user to cancel existing bid for a profile", async function () {
      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

      // permit NFT tokens
      const nftTokenPermitDigest = await getDigest(
        ethers.provider,
        "NFT.com",
        deployedNftToken.address,
        getHash(
          ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
          [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedProfileAuction.address, MAX_UINT, 0, MAX_UINT],
        ),
      );

      // domain separator V4
      const nftProfileBid = await getDigest(
        ethers.provider,
        "NFT.com Domain Auction",
        deployedProfileAuction.address,
        getHash(
          ["bytes32", "uint256", "string", "address"],
          [BID_TYPEHASH, BigNumber.from(10000), "satoshi", ownerSigner.address],
        ),
      );

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
      expect(await deployedNftToken.allowance(ownerSigner.address, deployedProfileAuction.address)).to.be.equal(0);

      const { v: nftV, r: nftR, s: nftS } = sign(nftTokenPermitDigest, ownerSigner);
      const { v: v0, r: r0, s: s0 } = sign(nftProfileBid, ownerSigner);

      await deployedProfileAuction
        .connect(owner)
        .cancelBid(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0);

      await expect(
        deployedProfileAuction
          .connect(owner)
          .mintProfileFor(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, nftV, nftR, nftS),
      ).to.be.reverted;

      expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

      // make sure profile cannot be claimed
      await expect(
        deployedProfileAuction
          .connect(owner)
          .claimProfile(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, { value: profileFeeWei }),
      ).to.be.reverted;
    });

    it("should allow the governor to set a shorter block wait and then redeem profile", async function () {
      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

      await deployedProfileAuction.setBlockWait(1);

      // permit NFT tokens
      const nftTokenPermitDigest = await getDigest(
        ethers.provider,
        "NFT.com",
        deployedNftToken.address,
        getHash(
          ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
          [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedProfileAuction.address, MAX_UINT, 0, MAX_UINT],
        ),
      );

      // domain separator V4
      const nftProfileBid = await getDigest(
        ethers.provider,
        "NFT.com Domain Auction",
        deployedProfileAuction.address,
        getHash(
          ["bytes32", "uint256", "string", "address"],
          [BID_TYPEHASH, BigNumber.from(10000), "satoshi", ownerSigner.address],
        ),
      );

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
      expect(await deployedNftToken.allowance(ownerSigner.address, deployedProfileAuction.address)).to.be.equal(0);

      const { v: nftV, r: nftR, s: nftS } = sign(nftTokenPermitDigest, ownerSigner);
      const { v: v0, r: r0, s: s0 } = sign(nftProfileBid, ownerSigner);

      await deployedProfileAuction
        .connect(owner)
        .mintProfileFor(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, nftV, nftR, nftS);

      expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

      // make sure profile cannot be claimed
      await deployedProfileAuction
        .connect(owner)
        .claimProfile(BigNumber.from(10000), "satoshi", ownerSigner.address, v0, r0, s0, { value: profileFeeWei });

      expect(await deployedNftProfile.totalSupply()).to.be.equal(1);

      await expect(deployedProfileAuction.connect(addr1).redeemProfile(0)).to.be.reverted; // revert because addr1 doesn't own "satoshi"
      await expect(deployedProfileAuction.connect(addr1).redeemProfile(1)).to.be.reverted; // rvert because there is no profile with tokenId 1
      await expect(deployedProfileAuction.connect(owner).redeemProfile(1)).to.be.reverted; // rvert because there is no profile with tokenId 1

      // revert because minimum block time hasn't been met
      await expect(deployedProfileAuction.connect(owner).redeemProfile(0)).to.be.reverted;

      await advanceBlock(); // + 1 block

      // make sure owner of "satoshi" matches
      expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);

      // transfer NFT to new user to make sure it comes back to governance wallet after redeeming
      await deployedNftProfile.connect(owner).transferFrom(owner.address, addr1.address, 0);

      // make sure new owner of "satoshi" is addr1
      expect(await deployedNftProfile.ownerOf(0)).to.be.equal(addr1.address);

      let previousSupply = await deployedNftToken.totalSupply();

      // approve token spend by redeem
      await deployedNftProfile.connect(addr1).approve(deployedProfileAuction.address, 0);

      await expect(deployedProfileAuction.connect(addr1).redeemProfile(0))
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(deployedProfileAuction.address, addr1.address, BigNumber.from(9950)); // receive 99.5% of the staked amount

      expect(await deployedNftToken.totalSupply()).to.be.equal(BigNumber.from(previousSupply).sub(BigNumber.from(50))); // 50 less tokens in the suppply

      expect(await deployedNftToken.balanceOf(addr1.address)).to.be.equal(BigNumber.from(9950));

      // token comes back to user
      expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
    });

    describe("Protocol Upgrades", function () {
      it("should upgrade profile contract to V3", async function () {
        const ProfileAuctionV3 = await ethers.getContractFactory("ProfileAuctionV3");

        let deployedProfileAuctionV3 = await upgrades.upgradeProxy(deployedProfileAuction.address, ProfileAuctionV3);

        expect(await deployedProfileAuctionV3.getVariable()).to.be.equal("hello");

        expect(await deployedProfileAuctionV3.testFunction()).to.be.equal(12345);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
