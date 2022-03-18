const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { convertTinyNumber, sign, getDigest, getHash, GENESIS_KEY_TYPEHASH } = require("./utils/sign-utils");
const { parseBalanceMap } = require("./utils/parse-balance-map");

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
    let NftStake;
    let deployedNftStake;
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
    const auctionSeconds = "604800"; // seconds in 1 week
    const RINKEBY_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await ethers.getContractFactory("NftToken");
      [owner, second, addr1, addr2, ...addrs] = await ethers.getSigners();

      const name = "NFT.com Genesis Key";
      const symbol = "NFTKEY";
      const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
      const multiSig = addr1.address;

      NftProfileHelper = await ethers.getContractFactory("NftProfileHelper");
      deployedNftProfileHelper = await NftProfileHelper.deploy();

      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

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

      deployedNftToken = await NftToken.deploy();

      NftProfile = await ethers.getContractFactory("NftProfile");
      deployedNftProfile = await upgrades.deployProxy(
        NftProfile,
        [
          "NFT.com", // string memory name,
          "NFT.com", // string memory symbol,
          deployedNftToken.address, // address _nftCashAddress,
        ],
        { kind: "uups" },
      );

      GenesisStake = await ethers.getContractFactory("GenesisNftStake");
      deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKey.address);

      NftStake = await ethers.getContractFactory("PublicNftStake");
      deployedNftStake = await NftStake.deploy(deployedNftToken.address);

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

        const genesisKeyBid2 = await getDigest(
          ethers.provider,
          "NFT.com Genesis Key",
          deployedGenesisKey.address,
          getHash(
            ["bytes32", "uint256", "address"],
            [GENESIS_KEY_TYPEHASH, convertTinyNumber(2), secondSigner.address], // 1 WETH
          ),
        );

        const beforeWethAddr1 = await deployedWETH.balanceOf(addr1.address);

        const jsonInput = JSON.parse(`{
          "${ownerSigner.address}": "1",
          "${secondSigner.address}": "2"
        }`);

        const wethMin = convertTinyNumber(1);

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

        await expect(
          deployedGenesisKeyDistributor
            .connect(owner)
            .claim(
              merkleResult.claims[`${ownerSigner.address}`].index,
              ownerSigner.address,
              merkleResult.claims[`${ownerSigner.address}`].amount,
              merkleResult.claims[`${ownerSigner.address}`].proof,
            ),
        )
          .to.emit(deployedWETH, "Transfer")
          .withArgs(ownerSigner.address, addr1.address, convertTinyNumber(1));

        expect(await deployedWETH.balanceOf(addr1.address)).to.eq(
          BigNumber.from(beforeWethAddr1).add(convertTinyNumber(1)),
        );

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(1);

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

        await expect(
          deployedGenesisKeyDistributor
            .connect(second)
            .claim(
              merkleResult.claims[`${secondSigner.address}`].index,
              secondSigner.address,
              merkleResult.claims[`${secondSigner.address}`].amount,
              merkleResult.claims[`${secondSigner.address}`].proof,
            ),
        )
          .to.emit(deployedWETH, "Transfer")
          .withArgs(secondSigner.address, addr1.address, convertTinyNumber(1));

        expect(await deployedWETH.balanceOf(addr1.address)).to.eq(
          BigNumber.from(beforeWethAddr1).add(convertTinyNumber(2)),
        );

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(2);

        expect(await deployedGenesisKey.tokenURI(1)).to.be.equal("ipfs://1");
        expect(await deployedGenesisKey.tokenURI(2)).to.be.equal("ipfs://2");

        // reverts bc ownerSigner == msg.sender
        await expect(deployedGenesisKey.setApprovalForAll(ownerSigner.address, true)).to.be.reverted;

        // just testing
        await deployedGenesisKey.setApprovalForAll(deployedGenesisKey.address, true);

        console.log(
          "=======> await deployedGenesisKey.tokenIdsOwned(ownerSigner.address)",
          await deployedGenesisKey.tokenIdsOwned(ownerSigner.address),
        );
      });

      // start public auction
      it("should allow users to cancel bids", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        // approve WETH
        await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);

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

        const { v: v0, r: r0, s: s0 } = sign(genesisKeyBid, ownerSigner);

        await deployedGenesisKey.connect(owner).cancelBid(convertTinyNumber(1), ownerSigner.address, v0, r0, s0);
      });

      it("should allow the multisig to allocate team and advisor grants for genesis keys", async function () {
        expect(await deployedGenesisKey.balanceOf(owner.address)).to.be.equal(0);
        expect(await deployedGenesisKey.balanceOf(second.address)).to.be.equal(0);
        expect(await deployedGenesisKey.balanceOf(addr1.address)).to.be.equal(0);

        // addr1.address = multisig
        await deployedGenesisKey.connect(addr1).claimGrantKey([owner.address, second.address, addr1.address]);

        expect(await deployedGenesisKey.balanceOf(owner.address)).to.be.equal(1);
        expect(await deployedGenesisKey.balanceOf(second.address)).to.be.equal(1);
        expect(await deployedGenesisKey.balanceOf(addr1.address)).to.be.equal(1);
      });

      // start public auction
      it("should allow a public auction to start, and not allow new blind auction bids", async function () {
        const initialWethPrice = convertTinyNumber(3); // 0.03 eth starting price
        const finalWethPrice = convertTinyNumber(1); // 0.01 eth floor
        const numKeysForSale = 3;

        // initialized public auction
        await deployedGenesisKey.initializePublicSale(initialWethPrice, finalWethPrice, numKeysForSale);

        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        // approve WETH
        await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);

        // domain separator V4
        const genesisKeyBid = await getDigest(
          ethers.provider,
          "NFT.com Genesis Key",
          deployedGenesisKey.address,
          getHash(
            ["bytes32", "uint256", "address"],
            [GENESIS_KEY_TYPEHASH, convertTinyNumber(1), ownerSigner.address], // 0.01 WETH
          ),
        );

        const currentPrice = await deployedGenesisKey.getCurrentPrice();
        console.log("current eth price: ", Number(currentPrice) / 10 ** 18);
        expect(await deployedGenesisKey.totalSupply()).to.eq(0);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(0);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertTinyNumber(3) });

        expect(await deployedGenesisKey.totalSupply()).to.eq(1);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(1);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        // recycle ETH to re use for Testing
        await deployedGenesisKey.setMultiSig(ownerSigner.address); // send to self
        await deployedGenesisKey.connect(owner).transferETH();

        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertTinyNumber(3) });

        expect(await deployedGenesisKey.totalSupply()).to.eq(2);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(2);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        await deployedGenesisKey.connect(owner).transferETH();

        // should have enough WETH initially
        const beforeBalance = await web3.eth.getBalance(owner.address);
        expect(await deployedWETH.balanceOf(owner.address)).to.be.gt(convertTinyNumber(3));

        expect(await deployedWETH.balanceOf(addr2.address)).to.eq(0);

        // not enough ETH, so should use WETH and refund ETH
        await deployedGenesisKey.setMultiSig(addr2.address); // send to third party
        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertTinyNumber(1) });

        const afterBalance = await web3.eth.getBalance(owner.address);

        expect(Number(beforeBalance) - Number(afterBalance)).to.be.lt(10 ** 15); // small difference due to gas
        expect(await deployedWETH.balanceOf(addr2.address)).to.gt(convertTinyNumber(2));
        expect(await deployedWETH.balanceOf(addr2.address)).to.lt(convertTinyNumber(3));

        expect(await deployedGenesisKey.totalSupply()).to.eq(3);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(3);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        // reverts because no more NFTs left
        await expect(deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertTinyNumber(3) })).to.be
          .reverted;
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
