const { expect } = require("chai");
const { BigNumber } = require("ethers");
const chalk = require("chalk");
const {
  convertBigNumber,
  convertSmallNumber,
  sign,
  getDigest,
  getHash,
  ERC20_PERMIT_TYPEHASH,
  BID_TYPEHASH,
  GENESIS_KEY_TYPEHASH,
} = require("./utils/sign-utils");
const { parseBalanceMapKey } = require("./utils/parse-balance-map");

const DECIMALS = 18;
const RINKEBY_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

describe("NFT Gasless Auction V2", function () {
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
    let NftStake;
    let deployedNftStake;
    const name = "NFT.com Genesis Key";
    const symbol = "NFTKEY";
    const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
    const auctionSeconds = "604800"; // seconds in 1 week

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await hre.ethers.getContractFactory("NftToken");
      NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
      GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
      NftStake = await hre.ethers.getContractFactory("PublicNftStake");
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
      const secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      deployedWETH = new ethers.Contract(
        wethAddress,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]`,
        ethers.provider,
      );

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, wethAddress, multiSig, auctionSeconds],
        { kind: "uups" },
      );

      // approve WETH
      await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);
      await deployedWETH.connect(second).approve(deployedGenesisKey.address, MAX_UINT);

      // domain separator V4
      const genesisKeyBid = await getDigest(
        ethers.provider,
        "NFT.com Genesis Key",
        deployedGenesisKey.address,
        getHash(
          ["bytes32", "uint256", "address"],
          [GENESIS_KEY_TYPEHASH, convertBigNumber(1), ownerSigner.address], // 1 WETH
        ),
      );

      await deployedWETH.connect(owner).transfer(second.address, convertSmallNumber(2));

      const genesisKeyBid2 = await getDigest(
        ethers.provider,
        "NFT.com Genesis Key",
        deployedGenesisKey.address,
        getHash(
          ["bytes32", "uint256", "address"],
          [GENESIS_KEY_TYPEHASH, convertSmallNumber(2), secondSigner.address], // 1 WETH
        ),
      );

      const { v: v0, r: r0, s: s0 } = sign(genesisKeyBid, ownerSigner);
      const { v: v1, r: r1, s: s1 } = sign(genesisKeyBid2, secondSigner);

      await expect(
        deployedGenesisKey
          .connect(owner)
          .whitelistExecuteBid(
            [convertBigNumber(1), convertSmallNumber(2)],
            [ownerSigner.address, secondSigner.address],
            [v0, v1],
            [r0, r1],
            [s0, s1],
          ),
      )
        .to.emit(deployedWETH, "Transfer")
        .withArgs(ownerSigner.address, addr1.address, convertSmallNumber(10));

      // owner now has 1 genesis key
      await deployedGenesisKey.connect(owner).claimKey(convertBigNumber(1), ownerSigner.address, v0, r0, s0);

      // second now has 1 genesis key
      await deployedGenesisKey.connect(second).claimKey(convertSmallNumber(2), secondSigner.address, v1, r1, s1);

      deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKey.address);

      deployedNftStake = await NftStake.deploy(deployedNftToken.address);

      await owner.sendTransaction({ to: addr1.address, value: convertSmallNumber(1) });
      await deployedWETH.connect(addr1).transfer(ownerSigner.address, await deployedWETH.balanceOf(addr1.address));
      // genesis key setup end ===============================================================

      deployedNftProfile = await upgrades.deployProxy(
        NftProfile,
        [
          "NFT.com", // string memory name,
          "NFT.com", // string memory symbol,
          deployedNftToken.address, // address _nftCashAddress,
        ],
        { kind: "uups" },
      );

      // ===============================================================

      NftBuyer = await ethers.getContractFactory("NftBuyer");
      deployedNftBuyer = await NftBuyer.deploy(
        RINKEBY_FACTORY_V2,
        deployedNftStake.address,
        deployedNftGenesisStake.address,
        deployedNftToken.address,
        wethAddress,
      );

      ProfileAuction = await ethers.getContractFactory("ProfileAuction");
      deployedProfileAuction = await upgrades.deployProxy(
        ProfileAuction,
        [
          deployedNftToken.address,
          deployedNftProfile.address,
          owner.address,
          deployedNftProfileHelper.address,
          deployedNftBuyer.address,
          deployedGenesisKey.address,
          deployedNftGenesisStake.address,
        ],
        { kind: "uups" },
      );

      const jsonInput = JSON.parse(`{
        "gavin": "0",
        "boled": "0",
        "satoshi": "1"
      }`);

      // merkle result is what you need to post publicly and store on FE
      merkleResult = parseBalanceMapKey(jsonInput);
      const { merkleRoot } = merkleResult;

      MerkleDistributorProfile = await ethers.getContractFactory("MerkleDistributorProfile");
      deployedMerkleDistributorProfile = await MerkleDistributorProfile.deploy(
        deployedProfileAuction.address,
        merkleRoot,
      );

      deployedProfileAuction.connect(owner).setMerkleDistributor(deployedMerkleDistributorProfile.address);

      // ===============================================================
      deployedNftProfile.setProfileAuction(deployedProfileAuction.address);

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
        await expect(
          deployedNftProfile.createProfile(addr1.address, [
            1000, // tokens
            await ethers.provider.getBlockNumber(), // block bid is minted
            "test", // profile URI
            1000, // block wait
          ]),
        ).to.be.reverted;
      });

      it("should revert on public functions without protection", async function () {
        await expect(deployedProfileAuction.publicMint("test_profile", 0, ZERO_BYTES, ZERO_BYTES)).to.be.reverted;

        // fails because only merkle distributor can call this
        await expect(deployedProfileAuction.connect(owner).genesisKeyMerkleClaim(0, "test", owner.adress)).to.be
          .reverted;
      });

      it("should allow genesis key owners to claim from merkle tree and without", async function () {
        expect(await deployedGenesisKey.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedGenesisKey.ownerOf(1)).to.be.equal(second.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(0);

        // reverts due to owner not having ownership over tokenId 1
        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile("1", 1)).to.be.reverted;

        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("profile0", 0);

        // console.log('merkleResult: ', merkleResult);
        await deployedMerkleDistributorProfile
          .connect(owner)
          .claim(merkleResult.claims.gavin.index, 0, "gavin", merkleResult.claims.gavin.proof);

        await expect(deployedProfileAuction.connect(owner).genesisKeyClaimProfile("gavin", 0)).to.be.reverted;

        await deployedProfileAuction.connect(owner).genesisKeyClaimProfile("boled", 0);

        // should revert since boled is already claimed
        await expect(deployedMerkleDistributorProfile
          .connect(owner)
          .claim(merkleResult.claims.boled.index, 0, "boled", merkleResult.claims.boled.proof)).to.be.reverted;

        expect(await deployedNftProfile.totalSupply()).to.be.equal(3);
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
