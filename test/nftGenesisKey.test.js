const { expect } = require("chai");
const { BigNumber } = require("ethers");
const {
  convertBigNumber,
  convertSmallNumber,
  sign,
  getDigest,
  getHash,
  GENESIS_KEY_TYPEHASH,
} = require("./utils/sign-utils");

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
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
    const auctionSeconds = "604800"; // seconds in 1 week

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftToken = await ethers.getContractFactory("NftToken");
      [owner, second, addr1, addr2,...addrs] = await ethers.getSigners();

      const name = "NFT.com Genesis Key";
      const symbol = "NFTKEY";
      const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
      const multiSig = addr1.address;

      let coldWallet = owner.address;

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

      NftProfile = await ethers.getContractFactory("NftProfileV1");
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
      deployedNftGenesisStake = await GenesisStake.deploy(
        deployedNftToken.address,
        wethAddress,
        deployedGenesisKey.address,
      );

      NftStake = await ethers.getContractFactory("PublicNftStake");
      deployedNftStake = await NftStake.deploy(deployedNftToken.address, wethAddress);

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
          deployedGenesisKey.address,
          deployedNftGenesisStake.address,
          deployedNftStake.address,
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

    describe("Blind Auction and Dutch Auction for Genesis Keys", async function () {
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

        const beforeWethAddr1 = await deployedWETH.balanceOf(addr1.address);

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

        expect(await deployedWETH.balanceOf(addr1.address)).to.eq(
          BigNumber.from(beforeWethAddr1).add(convertSmallNumber(12)),
        );

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(0);

        // make sure genesis key can be claimed
        await deployedGenesisKey.connect(owner).claimKey(convertBigNumber(1), ownerSigner.address, v0, r0, s0);

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(1);

        expect(await deployedGenesisKey.tokenURI(0)).to.be.equal("https://api.nft.com/genesis-key/0");

        // fail because owner != secondSigner, who is the only one who can claim
        await expect(
          deployedGenesisKey.connect(owner).claimKey(convertSmallNumber(2), secondSigner.address, v1, r1, s1),
        ).to.be.reverted;

        await deployedGenesisKey.connect(second).claimKey(convertSmallNumber(2), secondSigner.address, v1, r1, s1);

        expect(await deployedGenesisKey.totalSupply()).to.be.equal(2);

        expect(await deployedGenesisKey.tokenURI(1)).to.be.equal("https://api.nft.com/genesis-key/1");

        // reverts bc ownerSigner == msg.sender
        await expect(deployedGenesisKey.setApprovalForAll(ownerSigner.address, true)).to.be.reverted;

        // just testing
        await deployedGenesisKey.setApprovalForAll(deployedGenesisKey.address, true);
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
            [GENESIS_KEY_TYPEHASH, convertBigNumber(1), ownerSigner.address], // 1 WETH
          ),
        );

        const { v: v0, r: r0, s: s0 } = sign(genesisKeyBid, ownerSigner);

        await deployedGenesisKey.connect(owner).cancelBid(convertBigNumber(1), ownerSigner.address, v0, r0, s0);

        // reverts because the bid was cancelled
        await expect(
          deployedGenesisKey
            .connect(owner)
            .whitelistExecuteBid([convertBigNumber(1)], [ownerSigner.address], [v0], [r0], [s0]),
        ).to.be.reverted;
      });

      // start public auction
      it("should allow a public auction to start, and not allow new blind auction bids", async function () {
        const initialWethPrice = convertBigNumber(3); // 3 eth starting price
        const finalWethPrice = convertSmallNumber(1); // 0.1 eth floor
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
            [GENESIS_KEY_TYPEHASH, convertBigNumber(1), ownerSigner.address], // 1 WETH
          ),
        );

        const { v: v0, r: r0, s: s0 } = sign(genesisKeyBid, ownerSigner);

        // reverts because the whitelist blind auction is over now...
        await expect(
          deployedGenesisKey
            .connect(owner)
            .whitelistExecuteBid([convertBigNumber(1)], [ownerSigner.address], [v0], [r0], [s0]),
        ).to.be.reverted;

        const currentPrice = await deployedGenesisKey.getCurrentPrice();
        console.log("current eth price: ", Number(currentPrice) / 10 ** 18);
        expect(await deployedGenesisKey.totalSupply()).to.eq(0);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(0);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertBigNumber(3) });

        expect(await deployedGenesisKey.totalSupply()).to.eq(1);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(1);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        // recycle ETH to re use for Testing
        await deployedGenesisKey.setMultiSig(ownerSigner.address); // send to self
        await deployedGenesisKey.connect(owner).transferETH();

        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertBigNumber(3) });

        expect(await deployedGenesisKey.totalSupply()).to.eq(2);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(2);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        await deployedGenesisKey.connect(owner).transferETH();

        // should have enough WETH initially
        const beforeBalance = await web3.eth.getBalance(owner.address);
        expect(await deployedWETH.balanceOf(owner.address)).to.be.gt(convertBigNumber(3));

        expect(await deployedWETH.balanceOf(addr2.address)).to.eq(0);

        // not enough ETH, so should use WETH and refund ETH
        await deployedGenesisKey.setMultiSig(addr2.address); // send to third party
        await deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertBigNumber(1) });

        const afterBalance = await web3.eth.getBalance(owner.address);

        expect(Number(beforeBalance) - Number(afterBalance)).to.be.lt(10 ** 15); // small difference due to gas
        expect(await deployedWETH.balanceOf(addr2.address)).to.gt(convertBigNumber(2));
        expect(await deployedWETH.balanceOf(addr2.address)).to.lt(convertBigNumber(3));

        expect(await deployedGenesisKey.totalSupply()).to.eq(3);
        expect(await deployedGenesisKey.numKeysPublicPurchased()).to.eq(3);
        expect(await deployedGenesisKey.numKeysForSale()).to.eq(3);

        // reverts because no more NFTs left
        await expect(deployedGenesisKey.connect(owner).publicExecuteBid({ value: convertBigNumber(3) })).to.be.reverted;
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
