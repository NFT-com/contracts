const { expect } = require("chai");

const DECIMALS = 18;

describe("NFT.com V1 (on-chain bidding)", function () {
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
    let profileFeeWei = "500000000000000000";
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
          deployedCreatorBondingCurve.address, // deployedCreatorBondingCurve address
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
        await expect(deployedNftProfile.mintCreatorCoin(1000000, 0)).to.be.reverted;
      });

      it("burning creator coins should not work without a valid profile", async function () {
        await expect(deployedNftProfile.burnCreatorCoin(1000000, 0)).to.be.reverted;
      });
    });

    describe("Edge Functions", function () {
      it("should allow owner to set new owner on the profile auction", async function () {
        await deployedProfileAuction.setOwner(addr1.address);
      });

      it("should allow owner to set new owner on the profile auction", async function () {
        await deployedProfileAuction.setStaticFee(1);
      });

      it("should allow owner to set new owner on the profile auction", async function () {
        await deployedProfileAuction.setProfileFee(1);
      });

      it("should allow owner to set new owner on the nft profile", async function () {
        await deployedNftProfile.setOwner(addr1.address);
      });
    });

    describe("NFT Profile Auctions", function () {
      it("should not let someone redeem a non-existent profile", async function () {
        await expect(deployedProfileAuction.redeemProfile(0)).to.be.reverted;
      });

      it("should not let public claiming of profiles initially", async function () {
        await expect(deployedProfileAuction.buyProfile("helloworld", { value: profileFeeWei })).to.be.reverted;
      });

      it("should not allow minting of profiles urls with no bids by minter", async function () {
        await expect(deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "happy")).to.be.reverted;
      });

      it("should allow users to submit bids on un-taken profiles", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 10000);
        await deployedProfileAuction.connect(owner).submitProfileBid(10000, "george");
      });

      it("should not allow minting of profiles by non minter", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 10000);
        await deployedProfileAuction.connect(owner).submitProfileBid(10000, "george");

        await expect(deployedProfileAuction.connect(addr1).mintProfileFor(owner.address, "george")).to.be.reverted;
      });

      it("should allow purchasing of profiles when public claim is on", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, "10000000000000000000000");
        await expect(deployedProfileAuction.buyProfile("helloworld", { value: profileFeeWei })).to.be.reverted;

        // on
        await deployedProfileAuction.connect(owner).setPublicClaim(1);

        await expect(deployedProfileAuction.buyProfile("helloworld", { value: profileFeeWei }));
      });

      it("should allow minting of profiles for users via the minter", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 10000);
        await deployedProfileAuction.connect(owner).submitProfileBid(10000, "george");
        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(10000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"))
          .to.emit(deployedProfileAuction, "NewClaimableProfile")
          .withArgs(owner.address, "george", 10000, (await ethers.provider.getBlockNumber()) + 1);

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });

      it("should not allow users to change/remove/rebid bid after it is minted and claimable", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 10000);
        await deployedProfileAuction.connect(owner).submitProfileBid(10000, "george");
        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(10000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"))
          .to.emit(deployedProfileAuction, "NewClaimableProfile")
          .withArgs(owner.address, "george", 10000, (await ethers.provider.getBlockNumber()) + 1);

        await expect(deployedProfileAuction.changeBidURI("george", "yoyo")).to.be.reverted;
        await expect(deployedProfileAuction.removeProfileBid("george")).to.be.reverted;
        await expect(deployedProfileAuction.submitProfileBid(500, "george")).to.be.reverted;

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });

      it("should allow multiple bids by one user on a profile and then mint for users via the minter", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 15000);
        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(3000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 3000, 14000);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(14000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });

      it("should allow multiple bids by multipler users on profiles and then mint for users via the minter", async function () {
        await deployedNftToken.connect(owner).transfer(addr1.address, 1000000);
        await deployedNftToken.connect(owner).transfer(addr2.address, 1000000);

        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 25000);
        await deployedNftToken.connect(addr1).approve(deployedProfileAuction.address, 25000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george2"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george2", 10000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(addr1.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(addr1.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(3000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 3000, 14000);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(35000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.getTokenId("george")).to.be.equal(0);

        expect(await deployedNftProfile.getProfileOwnerFee(0)).to.be.equal(0);

        await deployedNftProfile.initializeCreatorCoin(0, 0, 0, ZERO_BYTES, ZERO_BYTES);
        expect(await deployedNftProfile.getProfileOwnerFee(0)).to.be.equal(1000);

        await deployedNftProfile.modifyProfileRate(1, 0);

        expect(await deployedNftProfile.getProfileOwnerFee(0)).to.be.equal(1);

        expect(await deployedNftProfile.getProtocolFee()).to.be.equal(200);

        let tokenURI = await deployedNftProfile.tokenURI(0);

        expect(tokenURI).to.be.equal("https://api.nft.com/uri/george");

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });

      it("should allow multiple bids by multipler users on profiles and then mint, and change bid other user", async function () {
        await deployedNftToken.connect(owner).transfer(addr1.address, 1000000);
        await deployedNftToken.connect(owner).transfer(addr2.address, 1000000);

        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 25000);
        await deployedNftToken.connect(addr1).approve(deployedProfileAuction.address, 25000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george2"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george2", 10000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(addr1.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george"))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(1000, "george"))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(addr1.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(3000, "george"))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 3000, 14000);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(35000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);

        await expect(deployedProfileAuction.connect(addr1).changeBidURI("george", "kyle"))
          .to.emit(deployedProfileAuction, "ChangedBidURI")
          .withArgs(addr1.address, "george", "kyle", 0);

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(addr1.address, "george")).to.be.reverted;

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(addr1.address, "kyle"))
          .to.emit(deployedProfileAuction, "NewClaimableProfile")
          .withArgs(addr1.address, "kyle", 11000, (await ethers.provider.getBlockNumber()) + 1);

        await expect(deployedProfileAuction.connect(addr1).claimProfile("george", { value: profileFeeWei })).to.be
          .reverted;
        await deployedProfileAuction.connect(addr1).claimProfile("kyle", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(2);
      });

      it("should allow changing bids to merge existing bids", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 50000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george2"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george2", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george3"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george3", 10000);

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(3);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(30000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await expect(deployedProfileAuction.connect(owner).changeBidURI("george", "kyle")).to.be.reverted; // because profile must be claimed now

        await expect(deployedProfileAuction.connect(owner).changeBidURI("george2", "george3")) // merged
          .to.emit(deployedProfileAuction, "ChangedBidURI")
          .withArgs(owner.address, "george2", "george3", 1);

        await expect(deployedProfileAuction.connect(owner).changeBidURI("george3", "george")).to.be.reverted; // because george is already minted for

        let currentBids = await deployedProfileAuction.getBids(owner.address);
        expect(currentBids.length).to.be.equal(2);

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george2")).to.be.reverted; // should be merged with george3

        await expect(deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george3"))
          .to.emit(deployedProfileAuction, "NewClaimableProfile")
          .withArgs(owner.address, "george3", 20000, (await ethers.provider.getBlockNumber()) + 1); // 20000 because both are merged

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(1);

        await deployedProfileAuction.connect(owner).claimProfile("george3", { value: profileFeeWei });

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(0);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(2);
      });

      it("should allow profile minting and not allow additional bids/removals after the profile is claimable", async function () {
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 25000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 1000, 11000);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(11000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        // revert after profile is minted for
        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george", { value: 0 })).to.be
          .reverted;
        await expect(deployedProfileAuction.connect(owner).removeProfileBid("george")).to.be.reverted;

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(1);

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(0);
      });

      it("should allow multiple bids by multipler users on profiles and then mint for users via the minter and let users remove bids manually", async function () {
        await deployedNftToken.connect(owner).transfer(addr1.address, 1000000);
        await deployedNftToken.connect(owner).transfer(addr2.address, 1000000);

        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 25000);
        await deployedNftToken.connect(addr1).approve(deployedProfileAuction.address, 25000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george2"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george2", 10000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(addr1.address, "george", 10000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(addr1).submitProfileBid(1000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(addr1.address, "george", 1000, 11000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(3000, "george", { value: 0 }))
          .to.emit(deployedProfileAuction, "UpdateBid")
          .withArgs(owner.address, "george", 3000, 14000);

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(2);
        expect((await deployedProfileAuction.getBids(addr1.address)).length).to.be.equal(1);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(35000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await expect(deployedNftProfile.profileDetails(0)).to.be.reverted;

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(2);
        expect((await deployedProfileAuction.getBids(addr1.address)).length).to.be.equal(1);

        await expect(deployedProfileAuction.connect(owner).removeProfileBid("george")).to.be.reverted;
        await expect(deployedProfileAuction.connect(owner).redeemProfile(0)).to.be.reverted;

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });
        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(1);

        await expect(deployedProfileAuction.connect(owner).removeProfileBid("george")).to.be.reverted;

        await expect(deployedProfileAuction.connect(addr1).removeProfileBid("george"))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(deployedProfileAuction.address, addr1.address, (11000 * 9950) / 10000);

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(1);
        expect((await deployedProfileAuction.getBids(addr1.address)).length).to.be.equal(0);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(24000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
      });

      it("should allow redemption of profiles after minimum wait time", async function () {
        await deployedNftToken.connect(owner).transfer(addr1.address, 1000000);
        await deployedNftToken.connect(owner).transfer(addr2.address, 1000000);

        // set minimum wait time to 0
        await deployedProfileAuction.connect(owner).setBlockWait(0);

        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 25000);
        await deployedNftToken.connect(addr1).approve(deployedProfileAuction.address, 25000);

        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(10000);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        expect((await deployedProfileAuction.getBids(owner.address)).length).to.be.equal(0);

        await expect(deployedProfileAuction.connect(owner).removeProfileBid("george")).to.be.reverted;

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);

        await deployedNftProfile.approve(deployedProfileAuction.address, 0); // approve token 0 721 to be able to transfer

        let preSupply = await deployedNftToken.totalSupply();

        await expect(deployedProfileAuction.connect(owner).redeemProfile(0))
          .to.emit(deployedProfileAuction, "RedeemProfile")
          .withArgs(owner.address, "george", (await ethers.provider.getBlockNumber()) + 1, (10000 * 9950) / 10000, 0);

        let postSupply = await deployedNftToken.totalSupply();

        // 50 BPs fee burned
        await expect(preSupply.sub(postSupply)).to.be.equal((10000 * 50) / 10000);

        expect(await deployedNftProfile.ownerOf(0)).to.equal(owner.address);
        expect(await deployedNftToken.balanceOf(deployedProfileAuction.address)).to.be.equal(0);
      });
    });

    describe("Protocol Upgrades", function () {
      it("should upgrade profile contract to V2", async function () {
        const NftProfileV2a = await ethers.getContractFactory("NftProfileV2a");

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, 15000);
        await expect(deployedProfileAuction.connect(owner).submitProfileBid(10000, "george"))
          .to.emit(deployedProfileAuction, "NewBid")
          .withArgs(owner.address, "george", 10000);

        expect(await deployedProfileAuction.connect(owner).mintProfileFor(owner.address, "george"));

        await deployedProfileAuction.connect(owner).claimProfile("george", { value: profileFeeWei });

        let deployedNftProfileV2a = await upgrades.upgradeProxy(deployedNftProfile.address, NftProfileV2a);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(1);
        expect(await deployedNftProfileV2a.totalSupply()).to.be.equal(1);

        expect(await deployedNftProfileV2a.getVariable()).to.be.equal("hello");

        expect(await deployedNftProfileV2a.testFunction()).to.be.equal(12345);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
