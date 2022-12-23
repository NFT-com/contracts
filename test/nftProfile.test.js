const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { convertBigNumber, convertSmallNumber, signHashProfile } = require("./utils/sign-utils");
const { advanceTimeAndBlock } = require("./utils/time");

const { parseBalanceMap } = require("./utils/parse-balance-map");

const DECIMALS = 18;

const Blockchain = {
  ETHEREUM: 0,
  HEDERA: 1,
  POLYGON: 2,
  SOLANA: 3,
  TEZOS: 4,
  FLOW: 5,
};
const UNI_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

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
    let NftStake;
    let deployedNftStake;
    let GenesisKeyTeamClaim;
    let deployedGenesisKeyTeamClaim;
    let GenesisKeyTeamDistributor;
    let deployedGkTeamDistributor;
    let deployedEthereumRegex;
    let deployedFlowRegex;
    let deployedHederaRegex;
    let deployedSolanaRegex;
    let deployedTezosRegex;
    let deployedNftResolver;
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
      NftStake = await hre.ethers.getContractFactory("NftStake");
      NftProfile = await hre.ethers.getContractFactory("NftProfile");
      ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");
      ProfileAuctionV2 = await hre.ethers.getContractFactory("ProfileAuctionV2");
      ProfileAuctionOct27Mainnet = await hre.ethers.getContractFactory("ProfileAuctionOct27Mainnet");

      [owner, second, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners();
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

      deployedNftStake = await NftStake.deploy(deployedNftToken.address);

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
        UNI_FACTORY_V2,
        deployedNftStake.address,
        deployedNftToken.address,
        wethAddress,
      );

      ProfileAuction = await ethers.getContractFactory("ProfileAuction");
      deployedProfileAuction = await upgrades.deployProxy(
        ProfileAuctionOct27Mainnet,
        [deployedNftProfile.address, owner.address, deployedNftProfileHelper.address, deployedGenesisKey.address],
        { kind: "uups" },
      );

      deployedProfileAuction.setUsdc(deployedNftToken.address);
      deployedProfileAuction.setContract1(deployedNftBuyer.address);
      deployedProfileAuction.setContract2(deployedNftStake.address);

      // ===============================================================
      deployedEthereumRegex = await (await hre.ethers.getContractFactory("EthereumRegex")).deploy();
      deployedFlowRegex = await (await hre.ethers.getContractFactory("FlowRegex")).deploy();
      deployedHederaRegex = await (await hre.ethers.getContractFactory("HederaRegex")).deploy();
      deployedSolanaRegex = await (await hre.ethers.getContractFactory("SolanaRegex")).deploy();
      deployedTezosRegex = await (await hre.ethers.getContractFactory("TezosRegex")).deploy();

      // allow upgrades
      const upgradedProfileAuction = await upgrades.upgradeProxy(deployedProfileAuction.address, ProfileAuction);
      deployedProfileAuction = upgradedProfileAuction;

      const upgradedProfileAuction2 = await upgrades.upgradeProxy(deployedProfileAuction.address, ProfileAuctionV2);
      deployedProfileAuction = upgradedProfileAuction2;

      await deployedNftProfile.setProfileAuction(deployedProfileAuction.address);
      await deployedProfileAuction.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);

      const { hash: h1, signature: s1 } = signHashProfile(second.address, "testminter");
      await deployedProfileAuction
        .connect(second)
        .genesisKeyBatchClaimProfile([["testminter", 2, second.address, h1, s1]]);
      const { hash: h2, signature: s2 } = signHashProfile(second.address, "testminter2");
      await deployedProfileAuction
        .connect(second)
        .genesisKeyBatchClaimProfile([["testminter2", 2, second.address, h2, s2]]);
      await deployedNftProfile.connect(second).transferFrom(second.address, addr1.address, 1); // transfer

      // owner edits
      await deployedProfileAuction.setOwner(second.address);
      await expect(deployedProfileAuction.connect(owner).setOwner(second.address)).to.be.reverted; // not owner
      await deployedProfileAuction.connect(second).setOwner(owner.address);
      expect(await deployedProfileAuction.owner()).to.be.equal(owner.address);

      // profile auction gov
      await deployedProfileAuction.setGovernor(second.address);
      await expect(deployedProfileAuction.connect(owner).setGovernor(second.address)).to.be.reverted; // not owner
      await deployedProfileAuction.connect(second).setGovernor(owner.address);
      expect(await deployedProfileAuction.governor()).to.be.equal(owner.address);

      // profile auction owner
      await deployedNftProfile.setOwner(second.address);
      await expect(deployedNftProfile.connect(owner).setOwner(second.address)).to.be.reverted; // not owner
      await deployedNftProfile.connect(second).setOwner(owner.address);
      expect(await deployedNftProfile.owner()).to.be.equal(owner.address);

      // fees
      await expect(deployedNftProfile.setProtocolFee(2001)).to.be.reverted; // > 2000 fee
      await deployedNftProfile.setProtocolFee(1000);
      expect(await deployedNftProfile.tokenURI(1)).to.be.equal(`https://api.nft.com/uri/testminter2`);
      await expect(deployedNftProfile.tokenURI(100)).to.be.reverted;

      deployedNftResolver = await hre.upgrades.deployProxy(
        await hre.ethers.getContractFactory("NftResolver"),
        [deployedNftProfile.address],
        { kind: "uups" },
      );

      await deployedNftResolver.setRegex(0, deployedEthereumRegex.address);
      await deployedNftResolver.setRegex(1, deployedHederaRegex.address);
      await deployedNftResolver.setRegex(2, deployedEthereumRegex.address);
      await deployedNftResolver.setRegex(3, deployedSolanaRegex.address);
      await deployedNftResolver.setRegex(4, deployedTezosRegex.address);
      await deployedNftResolver.setRegex(5, deployedFlowRegex.address);
      await deployedProfileAuction.setMaxProfilePerAddress(100); // sufficient ceiling for tests overall, can modify within tests for more fine tuning
      await deployedNftResolver.setMaxArray(100);
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

      it("profiles should have a initial supply of 1", async function () {
        expect(await deployedNftProfile.totalSupply()).to.equal(2); // minted in beforeEach
      });

      it("should call view functions in the nft profile", async function () {
        expect(await deployedNftProfile.name()).to.be.equal("NFT.com");
        expect(await deployedNftProfile.symbol()).to.be.equal("NFT.com");
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
      });

      it("should enforce mints through batch genesis keys with case insensitivity and enforce trademark edits", async function () {
        // transfer GK
        expect(await deployedGenesisKey.ownerOf("1")).to.be.equal(owner.address);
        expect(await deployedGenesisKey.ownerOf("2")).to.be.equal(second.address);
        await deployedGenesisKey.connect(owner).transferFrom(owner.address, second.address, "1");
        expect(await deployedGenesisKey.ownerOf("1")).to.be.equal(second.address);
        expect(await deployedGenesisKey.ownerOf("2")).to.be.equal(second.address);

        const { hash: h1, signature: s1 } = signHashProfile(second.address, "satoshi"); // valid
        const { hash: h2, signature: s2 } = signHashProfile(second.address, "Satoshi"); // invalid
        const { hash: h3, signature: s3 } = signHashProfile(second.address, "satoshi&"); // invalid
        const { hash: h4, signature: s4 } = signHashProfile(second.address, "satoshi btc"); // invalid
        const { hash: h5, signature: s5 } = signHashProfile(second.address, "satoshi🔥🚀💰😂🌕"); // invalid
        const { hash: h6, signature: s6 } = signHashProfile(second.address, "craig_wright"); // valid

        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi", "1", second.address, h1, s1],
            ["Satoshi", "1", second.address, h2, s2],
            ["craig_wright", "2", second.address, h6, s6],
          ]),
        ).to.be.revertedWith("gkp: !validURI");

        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi", "1", second.address, h1, s1],
            ["satoshi&", "1", second.address, h3, s3],
            ["craig_wright", "2", second.address, h6, s6],
          ]),
        ).to.be.revertedWith("gkp: !validURI");

        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi", "1", second.address, h1, s1],
            ["satoshi btc", "1", second.address, h4, s4],
            ["craig_wright", "2", second.address, h6, s6],
          ]),
        ).to.be.revertedWith("gkp: !validURI");

        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi", "1", second.address, h1, s1],
            ["satoshi🔥🚀💰😂🌕", "2", second.address, h5, s5],
            ["craig_wright", "2", second.address, h6, s6],
          ]),
        ).to.be.revertedWith("gkp: !validURI");

        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi", "1", second.address, h1, s1],
            ["craig_wright", "2", second.address, h6, s6],
            ["satoshi🔥🚀💰😂🌕", "2", second.address, h5, s5],
          ]),
        ).to.be.revertedWith("gkp: !validURI");

        await deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
          ["satoshi", "1", second.address, h1, s1],
          ["craig_wright", "2", second.address, h6, s6],
        ]);

        const satoshi_id = await deployedNftProfile.getTokenId("satoshi");
        const craig_wright_id = await deployedNftProfile.getTokenId("craig_wright");

        expect(satoshi_id).to.be.equal(2);
        expect(craig_wright_id).to.be.equal(3);

        expect(await deployedNftProfile.ownerOf(satoshi_id)).to.be.equal(second.address);
        expect(await deployedNftProfile.ownerOf(craig_wright_id)).to.be.equal(second.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(4);
        expect(await deployedNftProfile.tokenURI(2)).to.be.equal(`https://api.nft.com/uri/satoshi`);
        expect(await deployedNftProfile.tokenURI(3)).to.be.equal(`https://api.nft.com/uri/craig_wright`);
        await expect(deployedNftProfile.tokenURI(4)).to.be.reverted;
        expect(await deployedNftProfile.tokenUsed("satoshi")).to.be.true;
        expect(await deployedNftProfile.tokenUsed("craig_wright")).to.be.true;

        await deployedNftProfile.connect(second).transferFrom(second.address, owner.address, satoshi_id); // transfer satoshi to owner
        expect(await deployedNftProfile.ownerOf(satoshi_id)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(craig_wright_id)).to.be.equal(second.address);

        // reverts due to n/a not being a profile
        await expect(
          deployedNftProfile.connect(owner).tradeMarkEdit([
            ["satoshi", "a"],
            ["craig_wright", "b"],
            ["n/a", "c"],
          ]),
        ).to.be.reverted;

        // fails due to nft valid uri check
        await expect(
          deployedNftProfile.connect(owner).tradeMarkEdit([
            ["satoshi", "satoshi_A"],
            ["craig_wright", "craig_wright_x"],
          ]),
        ).to.be.revertedWith("!validNewUrl");

        // should succeed
        expect(
          await deployedNftProfile.connect(owner).tradeMarkEdit([
            ["satoshi", "satoshi_x"],
            ["craig_wright", "craig_wright_x"],
          ]),
        );

        expect(await deployedNftProfile.totalSupply()).to.be.equal(4);
        expect(await deployedNftProfile.tokenURI(2)).to.be.equal(`https://api.nft.com/uri/satoshi_x`);
        expect(await deployedNftProfile.tokenURI(3)).to.be.equal(`https://api.nft.com/uri/craig_wright_x`);
        await expect(deployedNftProfile.tokenURI(4)).to.be.reverted;
        expect(await deployedNftProfile.tokenUsed("satoshi")).to.be.false;
        expect(await deployedNftProfile.tokenUsed("craig_wright")).to.be.false;

        expect(await deployedNftProfile.tokenUsed("satoshi_x")).to.be.true;
        expect(await deployedNftProfile.tokenUsed("craig_wright_x")).to.be.true;

        // remint should work
        const { hash: h7, signature: s7 } = signHashProfile(second.address, "satoshi"); // valid
        const { hash: h8, signature: s8 } = signHashProfile(second.address, "craig_wright"); // valid

        await deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
          ["satoshi", "1", second.address, h7, s7],
          ["craig_wright", "1", second.address, h8, s8],
        ]);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(6);
        expect(await deployedNftProfile.tokenURI(4)).to.be.equal(`https://api.nft.com/uri/satoshi`);
        expect(await deployedNftProfile.tokenURI(5)).to.be.equal(`https://api.nft.com/uri/craig_wright`);
        await expect(deployedNftProfile.tokenURI(6)).to.be.reverted;
        expect(await deployedNftProfile.tokenUsed("satoshi")).to.be.true;
        expect(await deployedNftProfile.tokenUsed("craig_wright")).to.be.true;

        const { hash: h9, signature: s9 } = signHashProfile(second.address, "satoshi_y"); // valid
        const { hash: h10, signature: s10 } = signHashProfile(second.address, "craig_wright_y"); // valid

        // exceeds 4 mints per key
        await expect(
          deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
            ["satoshi_y", "1", second.address, h9, s9],
            ["craig_wright_y", "1", second.address, h10, s10],
          ]),
        ).to.be.reverted;

        await deployedProfileAuction.connect(second).genesisKeyBatchClaimProfile([
          ["satoshi_y", "1", second.address, h9, s9],
          ["craig_wright_y", "2", second.address, h10, s10],
        ]);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(8);
        expect(await deployedNftProfile.tokenURI(6)).to.be.equal(`https://api.nft.com/uri/satoshi_y`);
        expect(await deployedNftProfile.tokenURI(7)).to.be.equal(`https://api.nft.com/uri/craig_wright_y`);
        await expect(deployedNftProfile.tokenURI(8)).to.be.reverted;
        expect(await deployedNftProfile.tokenUsed("satoshi_y")).to.be.true;
        expect(await deployedNftProfile.tokenUsed("craig_wright_y")).to.be.true;
      });

      it("should allow proper regex association of cross chain addresses", async function () {
        expect(await deployedGenesisKey.ownerOf("1")).to.be.equal(owner.address);
        expect(await deployedGenesisKey.ownerOf("2")).to.be.equal(second.address);

        expect(await deployedHederaRegex.matches("0xa58112df57A29a5DFd7a22164a38216b56f39960")).to.be.equal(false);
        expect(await deployedHederaRegex.matches("0x18613D38367ddE6522D36f3546b9777880d88cA3")).to.be.equal(false);
        expect(await deployedHederaRegex.matches("0x956Ae058bb6fF5C5784050526142006327D5186a")).to.be.equal(false);

        expect(await deployedHederaRegex.matches("0.0.1")).to.be.equal(true);
        expect(await deployedHederaRegex.matches("0.0.99")).to.be.equal(true);
        expect(await deployedHederaRegex.matches("0.0.112233")).to.be.equal(true);
        expect(await deployedHederaRegex.matches("0.0.12")).to.be.equal(true);
        expect(await deployedHederaRegex.matches("0.0.991")).to.be.equal(true);
        expect(await deployedHederaRegex.matches("0.0.112203")).to.be.equal(true);

        expect(await deployedEthereumRegex.matches("0xa58112df57A29a5DFd7a22164a38216b56f39960")).to.be.equal(true);
        expect(await deployedEthereumRegex.matches("0x18613D38367ddE6522D36f3546b9777880d88cA3")).to.be.equal(true);
        expect(await deployedEthereumRegex.matches("0x956Ae058bb6fF5C5784050526142006327D5186a")).to.be.equal(true);
        expect(await deployedEthereumRegex.matches("0.0.1")).to.be.equal(false);
        expect(await deployedEthereumRegex.matches("0.0.23")).to.be.equal(false);
        expect(await deployedEthereumRegex.matches("0123123")).to.be.equal(false);

        expect(await deployedHederaRegex.matches("0.1.7777777")).to.be.equal(false);
        expect(await deployedHederaRegex.matches("1.0.")).to.be.equal(false);
        expect(await deployedHederaRegex.matches("112233")).to.be.equal(false);

        expect(await deployedSolanaRegex.matches("112233")).to.be.equal(false);
        expect(await deployedSolanaRegex.matches("0.1.7777777")).to.be.equal(false);
        expect(await deployedSolanaRegex.matches("0xa58112df57A29a5DFd7a22164a38216b56f39960")).to.be.equal(false);
        expect(await deployedSolanaRegex.matches("0x18613D38367ddE6522D36f3546b9777880d88cA3")).to.be.equal(false);
        expect(await deployedSolanaRegex.matches("EQ1RbBVQx2gs5PQQgMrVx96wZ5ts65GJbEYTGBMnvddS")).to.be.equal(true);
        expect(await deployedSolanaRegex.matches("3Q5XWkkEvmWFYPRyneCuhvJvhaRawhHQc1oK6XZUFc6b")).to.be.equal(true);
        expect(await deployedSolanaRegex.matches("DMXWb5EUdtzQESof1vaV2kjqUEQFebtZPwR9Vf4txbp6")).to.be.equal(true);
        expect(await deployedSolanaRegex.matches("3Q5XWkkEvmWFYPRyneCuhvJvhaRawhHQc1oK6XZUFc6b")).to.be.equal(true);

        expect(await deployedFlowRegex.matches("0x55ad22f01ef568a1")).to.be.equal(true);
        expect(await deployedFlowRegex.matches("0xf919ee77447b7497")).to.be.equal(true);
        expect(await deployedFlowRegex.matches("0x97ff37b1368e5387")).to.be.equal(true);
        expect(await deployedFlowRegex.matches("0x18eb4ee6b3c026d2")).to.be.equal(true);

        expect(await deployedFlowRegex.matches("0xa58112df57A29a5DFd7a22164a38216b56f39960")).to.be.equal(false);
        expect(await deployedFlowRegex.matches("0x18613D38367ddE6522D36f3546b9777880d88cA3")).to.be.equal(false);
        expect(await deployedFlowRegex.matches("EQ1RbBVQx2gs5PQQgMrVx96wZ5ts65GJbEYTGBMnvddS")).to.be.equal(false);
        expect(await deployedFlowRegex.matches("DMXWb5EUdtzQESof1vaV2kjqUEQFebtZPwR9Vf4txbp6")).to.be.equal(false);

        expect(await deployedTezosRegex.matches("tz3RKYFsLuQzKBtmYuLNas7uMu3AsYd4QdsA")).to.be.equal(true);
        expect(await deployedTezosRegex.matches("KT1TjHyHTnL4VMQQyD75pr3ZTemyPvQxRPpA")).to.be.equal(true);
        expect(await deployedTezosRegex.matches("tz1hWN1N3feet6DXBy2dnzsxaHpp27wpweAk")).to.be.equal(true);
        expect(await deployedTezosRegex.matches("tz1c4GjeL8bzRJQgj9tNzzaCRzB8APGMGdyy")).to.be.equal(true);

        expect(await deployedTezosRegex.matches("0xa58112df57A29a5DFd7a22164a38216b56f39960")).to.be.equal(false);
        expect(await deployedTezosRegex.matches("0x18613D38367ddE6522D36f3546b9777880d88cA3")).to.be.equal(false);
        expect(await deployedTezosRegex.matches("EQ1RbBVQx2gs5PQQgMrVx96wZ5ts65GJbEYTGBMnvddS")).to.be.equal(false);
        expect(await deployedTezosRegex.matches("DMXWb5EUdtzQESof1vaV2kjqUEQFebtZPwR9Vf4txbp6")).to.be.equal(false);
      });

      it("should allow genesis key owners to claim profiles and test profile extensions using ETH and ERC20s", async function () {
        expect(await deployedProfileAuction.genKeyWhitelistOnly()).to.be.true;
        expect(await deployedProfileAuction.publicMintBool()).to.be.false;

        expect(await deployedGenesisKey.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedGenesisKey.ownerOf(2)).to.be.equal(secondSigner.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(2);

        const { hash: h0, signature: s0 } = signHashProfile(owner.address, "gavin");
        // await deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["gavin", 1, owner.address, h0, s0]]);

        const { hash: h1, signature: s1 } = signHashProfile(owner.address, "boled");
        // await deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["boled", 1, owner.address, h1, s1]]);

        // batch claim
        await deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([
          ["gavin", 1, owner.address, h0, s0],
          ["boled", 1, owner.address, h1, s1],
        ]);

        // should go thru
        const { hash: h2, signature: s2 } = signHashProfile(second.address, "satoshi");
        await deployedProfileAuction
          .connect(second)
          .genesisKeyBatchClaimProfile([["satoshi", 2, second.address, h2, s2]]);

        // no more merkle tree claims -> now general claims
        await deployedProfileAuction.connect(owner).setGenKeyWhitelistOnly(false);

        // reverts due to owner not having ownership over tokenId 1
        const { hash: h3, signature: s3 } = signHashProfile(owner.address, "1");
        await expect(
          deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["1", 2, owner.address, h3, s3]]),
        ).to.be.reverted;

        const { hash: h4, signature: s4 } = signHashProfile(owner.address, "profile0");
        await deployedProfileAuction
          .connect(owner)
          .genesisKeyBatchClaimProfile([["profile0", 1, owner.address, h4, s4]]);

        const { hash: h5, signature: s5 } = signHashProfile(owner.address, "gavin");
        await expect(
          deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["gavin", 1, owner.address, h5, s5]]),
        ).to.be.reverted;

        const { hash: h6, signature: s6 } = signHashProfile(owner.address, "boled");
        await expect(
          deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["boled", 1, owner.address, h6, s6]]),
        ).to.be.reverted;

        const { hash: h7, signature: s7 } = signHashProfile(owner.address, "profile1");
        const { hash: h8, signature: s8 } = signHashProfile(owner.address, "profile2");
        const { hash: h9, signature: s9 } = signHashProfile(owner.address, "profile3");
        const { hash: h10, signature: s10 } = signHashProfile(owner.address, "profile4");
        await deployedProfileAuction
          .connect(owner)
          .genesisKeyBatchClaimProfile([["profile1", 1, owner.address, h7, s7]]);
        await deployedProfileAuction
          .connect(owner)
          .genesisKeyBatchClaimProfile([["profile2", 1, owner.address, h8, s8]]);
        await deployedProfileAuction
          .connect(owner)
          .genesisKeyBatchClaimProfile([["profile3", 1, owner.address, h9, s9]]);
        await deployedProfileAuction
          .connect(owner)
          .genesisKeyBatchClaimProfile([["profile4", 1, owner.address, h10, s10]]);

        // reverts due to expiry
        await expect(
          deployedProfileAuction.connect(owner).purchaseExpiredProfile("profile4", 86400, 27, ZERO_BYTES, ZERO_BYTES),
        ).to.be.reverted;

        const { hash: h11, signature: s11 } = signHashProfile(owner.address, "profile5");
        await expect(
          deployedProfileAuction.connect(owner).genesisKeyBatchClaimProfile([["profile5", 1, owner.address, h11, s11]]),
        ).to.be.reverted;

        expect(await deployedNftProfile.totalSupply()).to.be.equal(10);
        // open public mint
        await deployedProfileAuction.connect(owner).setPublicMint(true);

        // approve first
        await deployedNftToken.connect(owner).approve(deployedProfileAuction.address, MAX_UINT);
        await deployedNftToken.connect(second).approve(deployedProfileAuction.address, MAX_UINT);
        const { hash: h12, signature: s12 } = signHashProfile(owner.address, "profile5");
        const { hash: h13, signature: s13 } = signHashProfile(owner.address, "profile6");
        const { hash: h14, signature: s14 } = signHashProfile(owner.address, "profile7");

        // less than 1 year
        await expect(
          deployedProfileAuction.connect(owner).publicMint("profile5", 31535999, 27, ZERO_BYTES, ZERO_BYTES, h12, s12),
        ).to.be.reverted;

        await deployedProfileAuction
          .connect(owner)
          .publicMint("profile5", 31536000, 27, ZERO_BYTES, ZERO_BYTES, h12, s12);

        await deployedProfileAuction
          .connect(owner)
          .publicMint("profile6", 31536000, 27, ZERO_BYTES, ZERO_BYTES, h13, s13);

        await deployedProfileAuction
          .connect(owner)
          .publicMint("profile7", 31536000, 27, ZERO_BYTES, ZERO_BYTES, h14, s14);

        // only used for this portion =====================================================================================
        await deployedProfileAuction.connect(owner).setPublicMint(false);
        const { hash: h15, signature: s15 } = signHashProfile(addr5.address, "profile_addr5");
        expect(await deployedProfileAuction.publicMinted(addr5.address)).to.be.equal(0); // 0 publicly minted profiles for addr5
        await expect(deployedProfileAuction.connect(addr5).publicClaim("test_profile_addr5", h15, s15)).to.be.reverted; // signature mismatch

        const maxProfilePerAddress = await deployedProfileAuction.maxProfilePerAddress();
        await deployedProfileAuction.setMaxProfilePerAddress(1); // for testing purposes

        expect(await deployedProfileAuction.publicClaimBool()).to.be.equal(false);
        await expect(deployedProfileAuction.connect(addr5).publicClaim("profile_addr5", h15, s15)).to.be.revertedWith(
          "pc: publicClaimBool",
        );
        await deployedProfileAuction.connect(owner).setPublicClaim(true);
        expect(await deployedProfileAuction.publicClaimBool()).to.be.equal(true);
        await deployedProfileAuction.connect(addr5).publicClaim("profile_addr5", h15, s15); // succeeds
        expect(await deployedProfileAuction.publicMinted(addr5.address)).to.be.equal(1); // 1 since previous action succeeded

        const { hash: h16, signature: s16 } = signHashProfile(addr5.address, "profile_addr5_2");
        // should fail because max profile met (1 / 1)
        await expect(deployedProfileAuction.connect(addr5).publicClaim("profile_addr5_2", h16, s16)).to.be.reverted;

        await deployedProfileAuction.setMaxProfilePerAddress(2); // return back to norm
        await deployedProfileAuction.connect(addr5).publicClaim("profile_addr5_2", h16, s16); // succeeds due to this bar being set
        expect(await deployedProfileAuction.publicMinted(addr5.address)).to.be.equal(2); // 2 since previous action succeeded

        await deployedProfileAuction.setMaxProfilePerAddress(maxProfilePerAddress); // return back to norm
        // ================================================================================================================

        // go back
        await deployedProfileAuction.connect(owner).setPublicMint(true);

        deployedProfileAuction.setUsdc("0x0000000000000000000000000000000000000000"); // null address

        expect(await ethers.provider.getBalance(deployedNftBuyer.address)).to.be.equal(0);
        await deployedProfileAuction.connect(owner).setYearlyFee("10000000000000000");

        // reverts due to not enough ETH being passed
        await expect(deployedProfileAuction.connect(owner).extendLicense("profile5", 86400, 27, ZERO_BYTES, ZERO_BYTES))
          .to.be.reverted;

        const feeRent = await deployedProfileAuction.getFee("profile5", 86400);
        console.log(`fee rent ETH for profile5 for 86400 is: ${Number(feeRent)}`);

        // don't need signature bc owner already approved
        await deployedProfileAuction
          .connect(owner)
          .extendLicense("profile5", 86400, 27, ZERO_BYTES, ZERO_BYTES, { value: "10000000000000000" });

        expect(await ethers.provider.getBalance(deployedNftBuyer.address)).to.be.equal(feeRent);

        await deployedNftToken.connect(owner).transfer(second.address, convertBigNumber(10000));

        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(owner.address);

        // reverts due to ETH not being sent
        await expect(
          deployedProfileAuction.connect(second).purchaseExpiredProfile("profile6", 86400, 27, ZERO_BYTES, ZERO_BYTES),
        ).to.be.reverted;

        const feeRent2 = await deployedProfileAuction.getFee("profile6", 86400);
        console.log(`fee rent ETH for profile6 for 86400 is: ${Number(feeRent2)}`);

        const expiryTime = await deployedNftProfile.getExpiryTimeline(["profile6"]);
        await advanceTimeAndBlock(Number(expiryTime[0]) + 86400 * 10); // advance expiry + 10 days

        await deployedProfileAuction
          .connect(second)
          .purchaseExpiredProfile("profile6", 86400, 27, ZERO_BYTES, ZERO_BYTES, { value: "10000000000000000" });

        // try to purchase profile 5 (fail bc not expired yet)
        await expect(
          deployedProfileAuction
            .connect(second)
            .purchaseExpiredProfile("profile6", 86400, 27, ZERO_BYTES, ZERO_BYTES, { value: "10000000000000000" }),
        ).to.be.revertedWith("!expired");

        expect(await ethers.provider.getBalance(deployedNftBuyer.address)).to.be.equal(feeRent.add(feeRent2));

        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(second.address);
        await deployedNftProfile.connect(owner).tradeMarkTransfer([["profile6", owner.address]]);
        expect(await deployedNftProfile.profileOwner("profile6")).to.be.equal(owner.address);

        expect(await deployedNftProfile.totalSupply()).to.be.equal(15);
      });

      it("should allow profiles to associate other addresses", async function () {
        await deployedNftResolver
          .connect(second)
          .addAssociatedAddresses(
            [[0, process.env.CICD ? process.env.MNEMONIC_PUBLIC_ADDR : "0x59495589849423692778a8c5aaca62ca80f875a4"]],
            "testminter",
          );

        // reverts due to checksum address being the same
        await expect(
          deployedNftResolver
            .connect(second)
            .addAssociatedAddresses(
              [[0, process.env.CICD ? process.env.MNEMONIC_PUBLIC_ADDR : "0x59495589849423692778a8c5aaCA62CA80f875a4"]],
              "testminter",
            ),
        ).to.be.reverted;

        // empty array since not found
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(0);

        // bi-directional (owner verification)
        await deployedNftResolver.connect(owner).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(1);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0); // chainId
        // associated address
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(
          process.env.CICD ? process.env.MNEMONIC_PUBLIC_ADDR : "0x59495589849423692778a8c5aaca62ca80f875a4",
        );

        await expect(
          deployedNftResolver
            .connect(second)
            .addAssociatedAddresses(
              [[0, process.env.CICD ? process.env.MNEMONIC_PUBLIC_ADDR : "0x59495589849423692778a8c5aaCA62CA80f875a4"]],
              "testminter",
            ),
        ).to.be.reverted; // reverts due to duplicate address

        await deployedNftResolver
          .connect(second)
          .addAssociatedAddresses([[0, "0x59495589849423692778a8c5aaCA62CA80f875af"]], "testminter");

        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(1);

        console.log("testminter before clearing: ", await deployedNftResolver.associatedAddresses("testminter"));

        await deployedNftResolver.connect(second).clearAssociatedAddresses("testminter");

        console.log("testminter after clearing: ", await deployedNftResolver.associatedAddresses("testminter"));
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(0);
      });

      it("should allow two different profiles to associate same address", async function () {
        await deployedNftResolver.connect(second).addAssociatedAddresses(
          [
            [0, addr1.address],
            [0, addr2.address],
            [0, addr3.address],
            [0, addr4.address],
          ],
          "testminter",
        );

        await deployedNftResolver.connect(addr1).addAssociatedAddresses(
          [
            [0, addr2.address],
            [0, addr3.address],
            [0, addr4.address],
          ],
          "testminter2",
        );
      });

      it("should allow multiple addresses to be added at the same time", async function () {
        await deployedNftResolver.connect(second).addAssociatedAddresses(
          [
            [0, addr1.address],
            [0, addr2.address],
            [0, addr3.address],
            [0, addr4.address],
          ],
          "testminter",
        );

        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(0);

        await expect(
          deployedNftResolver.connect(second).addAssociatedAddresses(
            [
              [0, addr1.address],
              [0, addr2.address],
              [0, addr3.address],
              [0, addr4.address],
            ],
            "testminter",
          ),
        ).to.be.reverted;

        await deployedNftResolver.connect(addr1).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(1);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr1.address);

        await deployedNftResolver.connect(addr2).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(2);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][1]).to.be.equal(addr2.address);

        await deployedNftResolver.connect(addr3).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(3);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][1]).to.be.equal(addr3.address);

        await expect(deployedNftProfile.profileOwner("jokes")).to.be.reverted; // due to profile not existing

        // succeeds
        await deployedNftResolver
          .connect(addr1)
          .removeAssociatedProfile("testminter", await deployedNftProfile.profileOwner("testminter"));

        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(2);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr2.address);

        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(2);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][1]).to.be.equal(addr3.address);

        // re add self
        await deployedNftResolver.connect(addr1).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(3);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr1.address);

        await deployedNftResolver.connect(addr4).associateSelfWithUsers(["testminter"]);
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(4);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][1]).to.be.equal(addr4.address);

        // reset
        await deployedNftResolver.connect(second).clearAssociatedAddresses("testminter");
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(0);
        await deployedNftResolver.connect(second).addAssociatedAddresses(
          [
            [0, addr1.address],
            [0, addr2.address],
            [0, addr3.address],
            [0, addr4.address],
            [1, "0.0.4123"],
            [3, "HWHCU7orwrmAmPa1kicZ31MSwTJsHo7HTLGFrUPHokxE"],
          ],
          "testminter",
        );

        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(6);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr1.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][1]).to.be.equal(addr2.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][1]).to.be.equal(addr3.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][1]).to.be.equal(addr4.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[4][0]).to.be.equal(1);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[4][1]).to.be.equal("0.0.4123");
        expect((await deployedNftResolver.associatedAddresses("testminter"))[5][0]).to.be.equal(3);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[5][1]).to.be.equal(
          "HWHCU7orwrmAmPa1kicZ31MSwTJsHo7HTLGFrUPHokxE",
        );

        // remove non-evm (reverts due to not being owner)
        await expect(deployedNftResolver.connect(addr5).removeAssociatedAddress([0, addr5.address], "testminter")).to.be
          .reverted;

        // reverts due to address not being found
        await expect(deployedNftResolver.connect(second).removeAssociatedAddress([0, addr5.address], "testminter")).to
          .be.reverted;

        // reverts due to address not being correct for chain
        await expect(deployedNftResolver.connect(second).removeAssociatedAddress([1, addr5.address], "testminter")).to
          .be.reverted;

        await deployedNftResolver.connect(second).removeAssociatedAddress([1, "0.0.4123"], "testminter");

        // verify new associated addresses after removing hedera
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(5);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr1.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][1]).to.be.equal(addr2.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][1]).to.be.equal(addr3.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][1]).to.be.equal(addr4.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[4][0]).to.be.equal(3);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[4][1]).to.be.equal(
          "HWHCU7orwrmAmPa1kicZ31MSwTJsHo7HTLGFrUPHokxE",
        );

        // remove EVM address
        await deployedNftResolver.connect(second).removeAssociatedAddress([0, addr4.address], "testminter");

        // verify new associated addresses after removing ETH
        expect((await deployedNftResolver.associatedAddresses("testminter")).length).to.be.equal(4);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[0][1]).to.be.equal(addr1.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[1][1]).to.be.equal(addr2.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[2][1]).to.be.equal(addr3.address);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][0]).to.be.equal(3);
        expect((await deployedNftResolver.associatedAddresses("testminter"))[3][1]).to.be.equal(
          "HWHCU7orwrmAmPa1kicZ31MSwTJsHo7HTLGFrUPHokxE",
        );
      });

      // TODO: flesh out more when we have this live
      it("should allow custom profile pricing", async function () {
        // length premium
        expect(await deployedProfileAuction.lengthPremium(1)).to.be.equal(1024);
        await deployedProfileAuction.setLengthPremium(1, 2000);
        expect(await deployedProfileAuction.lengthPremium(1)).to.be.equal(2000);
        await deployedProfileAuction.setLengthPremium(1, 1024);
        expect(await deployedProfileAuction.lengthPremium(1)).to.be.equal(1024);

        // yearly fee
        expect(await deployedProfileAuction.yearlyFee()).to.be.equal(convertBigNumber(100));
        await deployedProfileAuction.setYearlyFee(200);
        expect(await deployedProfileAuction.yearlyFee()).to.be.equal(200);
      });

      it("should be able to associate contract addresses", async function () {
        expect((await deployedNftResolver.associatedContract("testminter"))[0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedContract("testminter"))[1]).to.be.equal("");

        await expect(deployedNftResolver.connect(addr5).setAssociatedContract([0, addr5.address], "testminter")).to.be
          .reverted;

        await deployedNftResolver.connect(second).setAssociatedContract([0, addr5.address], "testminter");

        // due to notminted not being a real profile
        await expect(deployedNftResolver.associatedContract("notminted")).to.be.reverted;
        expect((await deployedNftResolver.associatedContract("testminter"))[0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedContract("testminter"))[1]).to.be.equal(addr5.address);

        await expect(deployedNftResolver.connect(addr5).clearAssociatedContract("testminter")).to.be.reverted;

        // unminted profile
        await expect(deployedNftResolver.connect(addr5).clearAssociatedContract("unmintedProfile")).to.be.reverted;

        await deployedNftResolver.connect(second).clearAssociatedContract("testminter");
        expect((await deployedNftResolver.associatedContract("testminter"))[0]).to.be.equal(0);
        expect((await deployedNftResolver.associatedContract("testminter"))[1]).to.be.equal("");
      });

      it("should be able to parse addresses from string", async function () {
        expect(await deployedNftResolver.parseAddr(addr1.address)).to.be.equal(addr1.address);

        // reverts due to not being a valid address with invalid letters
        await expect(deployedNftResolver.parseAddr("notAddress")).to.be.reverted;
      });

      it("should be able to set owner", async function () {
        expect(await deployedNftResolver.owner()).to.be.equal(owner.address);
        await deployedNftResolver.connect(owner).setOwner(second.address);
        expect(await deployedNftResolver.owner()).to.be.equal(second.address);
        await deployedNftResolver.connect(second).setOwner(addr1.address);
        expect(await deployedNftResolver.owner()).to.be.equal(addr1.address);
        await deployedNftResolver.connect(addr1).setOwner(second.address);
        expect(await deployedNftResolver.owner()).to.be.equal(second.address);
      });

      it("should correctly diagnose evm based enums", async function () {
        // unit tests for evm based system
        expect(await deployedNftResolver.evmBased(Blockchain.ETHEREUM)).to.be.equal(true);
        expect(await deployedNftResolver.evmBased(Blockchain.POLYGON)).to.be.equal(true);
        expect(await deployedNftResolver.evmBased(Blockchain.HEDERA)).to.be.equal(false);
        expect(await deployedNftResolver.evmBased(Blockchain.SOLANA)).to.be.equal(false);
        expect(await deployedNftResolver.evmBased(Blockchain.TEZOS)).to.be.equal(false);
        expect(await deployedNftResolver.evmBased(Blockchain.FLOW)).to.be.equal(false);
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
