const { expect } = require("chai");
const { BigNumber } = require("ethers");
const {
  convertBigNumber,
  convertSmallNumber,
  getDigest,
  getHash,
  signHashProfile,
  GENESIS_KEY_TYPEHASH,
} = require("./utils/sign-utils");

const { parseBalanceMap } = require("./utils/parse-balance-map");

const DECIMALS = 18;
const RINKEBY_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

describe("NFT Profile Auction / Minting", function () {
  try {
    let NftToken;
    let deployedNftToken;
    let NftProfile;
    let deployedNftProfile;
    let ProfileAuction;
    let deployedProfileAuction;
    let NftProfileHelper;
    let deployedNftProfileHelper;
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

    let GenesisKey;
    let merkleResult;
    let deployedGenesisKey;
    let deployedWETH;
    let GenesisStake;
    let deployedNftGenesisStake;
    let GenesisKeyTeamClaim;
    let deployedGenesisKeyTeamClaim;
    let GenesisKeyTeamDistributor;
    let deployedGkTeamDistributor;
    const name = "NFT.com Genesis Key";
    const symbol = "GENESISKEY";
    let wethAddress;
    const auctionSeconds = "604800"; // seconds in 1 week
    let secondSigner;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await hre.ethers.getContractFactory("NftToken");
      NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
      GenesisKey = await hre.ethers.getContractFactory("GenesisKeyOld");
      GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
      NftProfile = await hre.ethers.getContractFactory("NftProfile");
      ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");
      ProfileAuctionV2 = await hre.ethers.getContractFactory("ProfileAuctionV2");

      [owner, second, addr1, ...addrs] = await ethers.getSigners();
      let coldWallet = owner.address;

      deployedNftProfileHelper = await NftProfileHelper.deploy();

      deployedNftToken = await NftToken.deploy();

      // genesis key setup ===============================================================
      const multiSig = addr1.address;
      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
      secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      // mock token
      deployedWETH = await NftToken.deploy();
      wethAddress = deployedWETH.address;

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, multiSig, auctionSeconds, false, "ipfs://"],
        { kind: "uups" },
      );

      GenesisKeyTeamClaim = await ethers.getContractFactory("GenesisKeyTeamClaim");
      deployedGenesisKeyTeamClaim = await upgrades.deployProxy(GenesisKeyTeamClaim, [deployedGenesisKey.address], {
        kind: "uups",
      });

      GenesisKeyTeamDistributor = await ethers.getContractFactory("GenesisKeyTeamDistributor");
      deployedGkTeamDistributor = await GenesisKeyTeamDistributor.deploy(deployedGenesisKeyTeamClaim.address);

      await deployedGenesisKey.setGkTeamClaim(deployedGenesisKeyTeamClaim.address);

      // only set pause transfer until public sale is ove
      await deployedGenesisKey.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);
      await deployedGenesisKey.setWhitelist(deployedGenesisKeyTeamClaim.address, true);
      await deployedGenesisKey.setWhitelist(owner.address, true);
      await deployedGenesisKey.setWhitelist(second.address, true);
      await deployedGenesisKeyTeamClaim.setGenesisKeyMerkle(deployedGkTeamDistributor.address);

      // approve WETH
      await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);
      await deployedWETH.connect(second).approve(deployedGenesisKey.address, MAX_UINT);

      await deployedWETH.connect(owner).transfer(second.address, convertSmallNumber(2));

      const jsonInput = JSON.parse(`{
        "${ownerSigner.address}": "1",
        "${secondSigner.address}": "2"
      }`);

      const wethMin = convertSmallNumber(1);

      // merkle result is what you need to post publicly and store on FE
      const merkleResult = parseBalanceMap(jsonInput);
      const { merkleRoot } = merkleResult;

      const GenesisKeyDistributor = await ethers.getContractFactory("GenesisKeyDistributor");
      const deployedGenesisKeyDistributor = await GenesisKeyDistributor.deploy(
        deployedGenesisKey.address,
        merkleRoot,
        wethMin,
      );

      await deployedGenesisKey.connect(owner).setGenesisKeyMerkle(deployedGenesisKeyDistributor.address);

      await deployedGenesisKeyDistributor
        .connect(owner)
        .claim(
          merkleResult.claims[`${ownerSigner.address}`].index,
          ownerSigner.address,
          merkleResult.claims[`${ownerSigner.address}`].amount,
          merkleResult.claims[`${ownerSigner.address}`].proof,
          { value: wethMin },
        );

      await deployedGenesisKeyDistributor
        .connect(second)
        .claim(
          merkleResult.claims[`${secondSigner.address}`].index,
          secondSigner.address,
          merkleResult.claims[`${secondSigner.address}`].amount,
          merkleResult.claims[`${secondSigner.address}`].proof,
          { value: wethMin },
        );

      deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKey.address);

      await owner.sendTransaction({ to: addr1.address, value: convertSmallNumber(1) });
      await deployedWETH.connect(addr1).transfer(ownerSigner.address, await deployedWETH.balanceOf(addr1.address));
      // genesis key setup end ===============================================================

      deployedNftProfile = await upgrades.deployProxy(
        NftProfile,
        [
          "NFT.com", // string memory name,
          "NFT.com", // string memory symbol,
          "https://api.nft.com/uri/",
        ],
        { kind: "uups" },
      );

      // ===============================================================

      NftBuyer = await ethers.getContractFactory("NftBuyer");
      deployedNftBuyer = await NftBuyer.deploy(
        RINKEBY_FACTORY_V2,
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

      deployedProfileAuction.setUsdc(deployedNftToken.address);
      deployedProfileAuction.setContract1(deployedNftBuyer.address);
      deployedProfileAuction.setContract2(deployedNftGenesisStake.address);

      // ===============================================================
      deployedNftProfile.setProfileAuction(deployedProfileAuction.address);
      await deployedProfileAuction.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);

      // allow upgrades
      const upgradedProfileAuction = await upgrades.upgradeProxy(deployedProfileAuction.address, ProfileAuctionV2);
      deployedProfileAuction = upgradedProfileAuction;
    });

    describe("NFT Profiles Tests", function () {
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

      it("profiles should have a initial supply of 0", async function () {
        expect(await deployedNftProfile.totalSupply()).to.equal(0);
      });

      it("should call view functions in the nft profile", async function () {
        expect(await deployedNftProfile.name()).to.be.equal("NFT.com");
        expect(await deployedNftProfile.symbol()).to.be.equal("NFT.com");

        // reverts since no profile exists
        await expect(deployedNftProfile.tokenURI(0)).to.be.reverted;
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
        await expect(deployedNftProfile.createProfile(addr1.address, "test")).to.be.reverted;
      });

      it("should revert on public functions without protection", async function () {
        await expect(deployedProfileAuction.publicMint("test_profile", 0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;

        // fails because only merkle distributor can call this
        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile(0, "test", owner.adress)).to.be
          .reverted;
      });

      it("should allow genesis key owners to claim profiles", async function () {
        expect(await deployedProfileAuction.genKeyWhitelistOnly()).to.be.true;
        expect(await deployedProfileAuction.publicMintBool()).to.be.false;

        expect(await deployedGenesisKey.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedGenesisKey.ownerOf(2)).to.be.equal(secondSigner.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        const { hash: h0, signature: s0 } = signHashProfile(owner.address, "gavin");
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("gavin", 1, owner.address, h0, s0);

        const { hash: h1, signature: s1 } = signHashProfile(owner.address, "boled");
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("boled", 1, owner.address, h1, s1);

        // should go thru
        const { hash: h2, signature: s2 } = signHashProfile(second.address, "satoshi");
        await deployedProfileAuction.connect(second).genesisKeyClaimProfile("satoshi", 2, second.address, h2, s2);

        // no more merkle tree claims -> now general claims
        await deployedProfileAuction.connect(owner).setGenKeyWhitelistOnly(false);

        // reverts due to owner not having ownership over tokenId 1
        const { hash: h3, signature: s3 } = signHashProfile(owner.address, "1");
        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile("1", 2, owner.address, h3, s3)).to.be
          .reverted;

        const { hash: h4, signature: s4 } = signHashProfile(owner.address, "profile0");
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile0", 1, owner.address, h4, s4);

        const { hash: h5, signature: s5 } = signHashProfile(owner.address, "gavin");
        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile("gavin", 1, owner.address, h5, s5)).to
          .be.reverted;

        const { hash: h6, signature: s6 } = signHashProfile(owner.address, "boled");
        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile("boled", 1, owner.address, h6, s6)).to
          .be.reverted;

        const { hash: h7, signature: s7 } = signHashProfile(owner.address, "profile1");
        const { hash: h8, signature: s8 } = signHashProfile(owner.address, "profile2");
        const { hash: h9, signature: s9 } = signHashProfile(owner.address, "profile3");
        const { hash: h10, signature: s10 } = signHashProfile(owner.address, "profile4");
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile1", 1, owner.address, h7, s7);
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile2", 1, owner.address, h8, s8);
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile3", 1, owner.address, h9, s9);
        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile4", 1, owner.address, h10, s10);

        // reverts due to expiry
        await expect(
          deployedProfileAuction.connect(owner).purchaseExpiredProfile("profile4", 86400, 27, ZERO_BYTES, ZERO_BYTES),
        ).to.be.reverted;

        const { hash: h11, signature: s11 } = signHashProfile(owner.address, "profile5");
        await expect(
          deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile5", 1, owner.address, h11, s11),
        ).to.be.reverted;

        expect(await deployedNftProfile.totalSupply()).to.be.equal(8);
        // open public mint
        await deployedProfileAuction.connect(owner).setPublicMint(true);

        // approve first
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, MAX_UINT);
        await deployedNftToken.connect(second).approve(deployedProfileAuction.address, MAX_UINT);
        const { hash: h12, signature: s12 } = signHashProfile(owner.address, "profile5");
        const { hash: h13, signature: s13 } = signHashProfile(owner.address, "profile6");
        const { hash: h14, signature: s14 } = signHashProfile(owner.address, "profile7");

        await deployedProfileAuction.connect(owner).publicMint("profile5", 0, 27, ZERO_BYTES, ZERO_BYTES, h12, s12);

        await deployedProfileAuction.connect(owner).publicMint("profile6", 0, 27, ZERO_BYTES, ZERO_BYTES, h13, s13);

        await deployedProfileAuction.connect(owner).publicMint("profile7", 0, 27, ZERO_BYTES, ZERO_BYTES, h14, s14);

        // should this work?
        await deployedProfileAuction.connect(owner).extendLicense("profile5", 86400, 27, ZERO_BYTES, ZERO_BYTES);
        await deployedNftToken.connect(owner).transfer(second.address, convertBigNumber(10000));

        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(owner.address);
        await deployedProfileAuction
          .connect(second)
          .purchaseExpiredProfile("profile6", 86400, 27, ZERO_BYTES, ZERO_BYTES);
        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(second.address);
        await deployedNftProfile.connect(owner).tradeMarkTransfer("profile6", owner.address);
        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(owner.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(11);
      });

      it("should upgrade profile contract to V2", async function () {
        const ProfileAuctionV2 = await ethers.getContractFactory("ProfileAuctionV2");

        let deployedProfileAuctionV2 = await upgrades.upgradeProxy(deployedProfileAuction.address, ProfileAuctionV2);

        expect(await deployedProfileAuctionV2.getVariable()).to.be.equal("hello");

        expect(await deployedProfileAuctionV2.testFunction()).to.be.equal(12345);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
