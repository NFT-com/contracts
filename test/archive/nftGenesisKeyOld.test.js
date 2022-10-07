const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { convertTinyNumber, getDigest, getHash, GENESIS_KEY_TYPEHASH } = require("../utils/sign-utils");
const { parseBalanceMap } = require("../utils/parse-balance-map");

const DECIMALS = 18;

describe("Genesis Key Old Testing + Auction Mechanics", function () {
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
    let deployedGkTeamDistributor;

    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
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

      GenesisKey = await hre.ethers.getContractFactory("GenesisKeyOld");

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

      await deployedGenesisKey.setGkTeamClaim(deployedGenesisKeyTeamClaim.address);

      // only set pause transfer until public sale is over
      await deployedGenesisKey.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);
      await deployedGenesisKey.setWhitelist(deployedGenesisKeyTeamClaim.address, true);
      await deployedGenesisKey.setWhitelist(owner.address, true);
      await deployedGenesisKey.setWhitelist(second.address, true);
      await deployedGenesisKeyTeamClaim.setGenesisKeyMerkle(deployedGkTeamDistributor.address);

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
    });

    describe("Blind Auction and Decreasing Price Sale for Genesis Keys", async function () {
      it("should allow users to submit a signed signature for a genesis key", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
        const secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

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
            [GENESIS_KEY_TYPEHASH, convertTinyNumber(1), ownerSigner.address], // 1 WETH
          ),
        );

        await deployedWETH.connect(owner).transfer(second.address, convertTinyNumber(2));

        const jsonInput = JSON.parse(`{
          "${ownerSigner.address}": "1",
          "${secondSigner.address}": "2"
        }`);

        const ethMin = convertTinyNumber(1);

        // merkle result is what you need to post publicly and store on FE
        const merkleResult = parseBalanceMap(jsonInput);
        const { merkleRoot } = merkleResult;

        const GenesisKeyDistributor = await ethers.getContractFactory("GenesisKeyDistributor");
        const deployedGenesisKeyDistributor = await GenesisKeyDistributor.deploy(
          deployedGenesisKey.address,
          merkleRoot,
          ethMin,
        );

        await deployedGenesisKey.connect(owner).setGenesisKeyMerkle(deployedGenesisKeyDistributor.address);

        await deployedGenesisKeyDistributor
          .connect(owner)
          .claim(
            merkleResult.claims[`${ownerSigner.address}`].index,
            ownerSigner.address,
            merkleResult.claims[`${ownerSigner.address}`].amount,
            merkleResult.claims[`${ownerSigner.address}`].proof,
            {
              value: ethMin,
            },
          );

        const gkEth1 = await web3.eth.getBalance(deployedGenesisKey.address);
        console.log("gkEth1: ", gkEth1);
        await expect(gkEth1).to.be.equal(convertTinyNumber(0));

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        // reverts bc owner != secondSigner
        await expect(
          deployedGenesisKeyDistributor
            .connect(owner)
            .claim(
              merkleResult.claims[`${secondSigner.address}`].index,
              secondSigner.address,
              merkleResult.claims[`${secondSigner.address}`].amount,
              merkleResult.claims[`${secondSigner.address}`].proof,
            ),
        ).to.be.reverted;

        // reverts due to no ETH passed in
        await expect(
          deployedGenesisKeyDistributor
            .connect(second)
            .claim(
              merkleResult.claims[`${secondSigner.address}`].index,
              secondSigner.address,
              merkleResult.claims[`${secondSigner.address}`].amount,
              merkleResult.claims[`${secondSigner.address}`].proof,
            ),
        ).to.be.reverted;

        await deployedGenesisKeyDistributor
          .connect(second)
          .claim(
            merkleResult.claims[`${secondSigner.address}`].index,
            secondSigner.address,
            merkleResult.claims[`${secondSigner.address}`].amount,
            merkleResult.claims[`${secondSigner.address}`].proof,
            {
              value: ethMin,
            },
          );

        const gkEth2 = await web3.eth.getBalance(deployedGenesisKey.address);
        console.log("gkEth2: ", gkEth2);
        await expect(gkEth2).to.be.equal(convertTinyNumber(0));

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        console.log("owners 1 - 2", await deployedGenesisKey.multiOwnerOf(1, 2));
        await expect(deployedGenesisKey.multiOwnerOf(3, 2)).to.be.reverted;

        expect(await deployedGenesisKey.tokenURI(1)).to.be.equal("ipfs://1");
        expect(await deployedGenesisKey.tokenURI(2)).to.be.equal("ipfs://2");

        // reverts bc ownerSigner == msg.sender
        await expect(deployedGenesisKey.setApprovalForAll(ownerSigner.address, true)).to.be.reverted;

        // just testing
        await deployedGenesisKey.setApprovalForAll(deployedGenesisKey.address, true);
      });

      it("should allow the multisig to allocate team and advisor grants for genesis keys", async function () {
        expect(await deployedGenesisKey.balanceOf(owner.address)).to.be.equal(0);
        expect(await deployedGenesisKey.balanceOf(second.address)).to.be.equal(0);
        expect(await deployedGenesisKey.balanceOf(addr1.address)).to.be.equal(0);

        // addr1.address = multisig
        await deployedGenesisKey.connect(owner).claimGrantKey(3);

        expect(await deployedGenesisKey.balanceOf(deployedGenesisKeyTeamClaim.address)).to.be.equal(3);
      });

      it("should allow users to lock key", async function () {
        await deployedGenesisKey.connect(owner).setWhitelist(owner.address, false);
        await deployedGenesisKey.connect(owner).setWhitelist(second.address, false);
        await deployedGenesisKey.connect(owner).setWhitelist(addr1.address, false);
        await deployedGenesisKey.connect(owner).claimGrantKey(2);

        expect(await deployedGenesisKey.balanceOf(deployedGenesisKeyTeamClaim.address)).to.be.equal(2);
        expect(await deployedGenesisKey.totalSupply()).to.be.equal(2);

        // reverts due to !10000 keys
        await expect(deployedGenesisKey.transferFrom(owner.address, second.address, 1)).to.be.reverted;

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(2);

        for (let i = 0; i < 248; i++) {
          await deployedGenesisKey.connect(owner).claimGrantKey(1);
        }

        expect(await deployedGenesisKey.balanceOf(deployedGenesisKeyTeamClaim.address)).to.be.equal(250);
        expect(await deployedGenesisKey.totalSupply()).to.be.equal(250);
      });

      // start public auction
      it("should allow a public auction to start, and not allow new blind auction bids", async function () {
        const initialWethPrice = convertTinyNumber(3); // 0.03 eth starting price
        const finalWethPrice = convertTinyNumber(3); // 0.03 eth floor

        // initialized public auction
        await deployedGenesisKey.initializePublicSale(initialWethPrice, finalWethPrice);

        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        // approve WETH
        await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);

        const currentPrice = await deployedGenesisKey.getCurrentPrice();
        console.log("current eth price: ", Number(currentPrice) / 10 ** 18);
        expect(await deployedGenesisKey.totalSupply()).to.eq(0);

        await deployedGenesisKey.connect(owner).publicExecuteBid(1, { value: convertTinyNumber(30) });

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        // recycle ETH to re use for Testing
        await deployedGenesisKey.setMultiSig(ownerSigner.address); // send to self
        await deployedGenesisKey.connect(owner).transferETH();

        await deployedGenesisKey.connect(owner).publicExecuteBid(1, { value: convertTinyNumber(30) });

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        await deployedGenesisKey.connect(owner).publicExecuteBid(10, { value: convertTinyNumber(300) });

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        // reverts due to insufficient funds
        await expect(deployedGenesisKey.connect(owner).publicExecuteBid(10, { value: convertTinyNumber(20) })).to.be
          .reverted;

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        const ownerBalanceBefore = await web3.eth.getBalance(owner.address);
        console.log("ownerBalanceBefore: ", ownerBalanceBefore);
        await deployedGenesisKey.connect(owner).publicExecuteBid(10, { value: convertTinyNumber(500) });

        const ownerBalanceAfter = await web3.eth.getBalance(owner.address);
        console.log("ownerBalanceAfter: ", ownerBalanceAfter);
        console.log("ETH sent: ", ownerBalanceBefore - ownerBalanceAfter);

        console.log("await deployedGenesisKey.totalSupply(): ", Number(await deployedGenesisKey.totalSupply()));

        // 4722 total + 250 = 4972 (28 left)
        for (let i = 0; i < 47; i++) {
          await deployedGenesisKey.connect(owner).publicExecuteBid(100, { value: convertTinyNumber(300) });
          console.log(i + " totalSupply: " + Number(await deployedGenesisKey.totalSupply()));
        }

        console.log(
          "await deployedGenesisKey.remainingTeamAdvisorGrant(): ",
          Number(await deployedGenesisKey.remainingTeamAdvisorGrant()),
        );

        // reverts due to remainingTeamAdvisorGrant() != 0
        await expect(deployedGenesisKey.mintLeftOver(28, 5000)).to.be.reverted;
        await deployedGenesisKey.connect(owner).claimGrantKey(250);

        console.log("totalSupply: " + Number(await deployedGenesisKey.totalSupply()));
        console.log(
          "await deployedGenesisKey.remainingTeamAdvisorGrant(): ",
          Number(await deployedGenesisKey.remainingTeamAdvisorGrant()),
        );

        // reverts due to not selling out 10,000 at a time
        await expect(deployedGenesisKey.mintLeftOver(27, 5000)).to.be.reverted;
        await expect(deployedGenesisKey.mintLeftOver(28, 4999)).to.be.reverted;
        await expect(deployedGenesisKey.mintLeftOver(28, 5001)).to.be.reverted;

        const beforeBalance = await deployedGenesisKey.balanceOf(owner.address);
        console.log("beforeBalance: ", Number(beforeBalance));

        // should go through
        await deployedGenesisKey.mintLeftOver(28, 5000);
        await deployedGenesisKey.connect(owner).setMultiSig(addr1.address);
        expect(await deployedGenesisKey.balanceOf(deployedGenesisKey.address)).to.be.equal(28);
        const afterBalance = await deployedGenesisKey.balanceOf(owner.address);
        console.log("afterBalance: ", Number(afterBalance));
        expect(afterBalance - beforeBalance).to.be.equal(5000);
        expect(await deployedGenesisKey.totalSupply()).to.be.equal(10000);
        expect(await deployedGenesisKey.latestClaimTokenId()).to.be.equal(4972);

        // exceeds 4750 (250 reserved)
        expect(await deployedGenesisKey.balanceOf(addr1.address)).to.be.equal(0);

        // insufficient balance
        await expect(deployedGenesisKey.connect(addr1).publicBuyKey({ value: convertTinyNumber(2) })).to.be.reverted;

        await owner.sendTransaction({ to: addr1.address, value: convertTinyNumber(1000) });

        let bal = 1;
        let starting = Number(await deployedGenesisKey.latestClaimTokenId());
        console.log("starting: ", starting);
        for (let i = starting; i < 5000; i++) {
          await deployedGenesisKey.connect(addr1).publicBuyKey({ value: convertTinyNumber(3) });
          expect(await deployedGenesisKey.balanceOf(addr1.address)).to.be.equal(bal);
          expect(await deployedGenesisKey.ownerOf(await deployedGenesisKey.latestClaimTokenId())).to.be.equal(
            addr1.address,
          );
          bal += 1;
        }

        console.log("ending: ", Number(await deployedGenesisKey.latestClaimTokenId()));

        expect(await deployedGenesisKey.ownerOf(5001)).to.be.equal(owner.address);

        await expect(deployedGenesisKey.publicBuyKey({ value: convertTinyNumber(3) })).to.be.reverted;

        await deployedGenesisKey.connect(owner).transferETH();

        await deployedGenesisKey.connect(owner).setWhitelist(owner.address, true);
        await deployedGenesisKey.connect(owner).setWhitelist(second.address, true);
        await deployedGenesisKey.connect(owner).setWhitelist(addr1.address, true);

        await deployedGenesisKey.connect(owner).transferFrom(owner.address, second.address, 25);
        expect(await deployedGenesisKey.balanceOf(second.address)).to.be.equal(1);

        expect(await deployedGenesisKey.lockupBoolean()).to.be.false;
        // reverts due to lockUp booelan being false
        await expect(deployedGenesisKey.connect(owner).toggleLockup([25])).to.be.reverted;
        await deployedGenesisKey.connect(owner).toggleLockupBoolean();
        // owner != ownerOf(2)
        await expect(deployedGenesisKey.connect(owner).toggleLockup([25])).to.be.reverted;
        await deployedGenesisKey.connect(owner).toggleLockupBoolean();
        await expect(deployedGenesisKey.connect(owner).toggleLockup([21])).to.be.reverted;
        await deployedGenesisKey.connect(owner).toggleLockupBoolean();
        await deployedGenesisKey.connect(owner).toggleLockup([21]);
        expect(await deployedGenesisKey.lockupBoolean()).to.be.true;
        await expect(deployedGenesisKey.transferFrom(owner.address, second.address, 21)).to.be.reverted;

        console.log("currentXP 1: ", await deployedGenesisKey.currentXP(21));
        console.log("currentXP 2: ", await deployedGenesisKey.currentXP(25));

        await deployedGenesisKey.connect(owner).toggleLockup([21]);
        await deployedGenesisKey.transferFrom(owner.address, second.address, 21);
        expect(await deployedGenesisKey.balanceOf(second.address)).to.be.equal(2);

        console.log("currentXP after 2: ", await deployedGenesisKey.currentXP(21));
        console.log("currentXP after 1: ", await deployedGenesisKey.currentXP(25));
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
