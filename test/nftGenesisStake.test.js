const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH, GENESIS_KEY_TYPEHASH } = require("./utils/sign-utils");

const convertBigNumber = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

const convertSmallNumber = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(17)));
};

describe("NFT Token Genesis Staking (Localnet)", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftGenesisStake;
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

    let GenesisKey;
    let deployedGenesisKey;
    let deployedWETH;
    const name = "NFT.com Genesis Key";
    const symbol = "NFTKEY";
    const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
    const auctionSeconds = "604800"; // seconds in 1 week

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      console.log("1");

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy(); // mint 10B tokens

      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
      const multiSig = addr1.address;

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, wethAddress, multiSig, auctionSeconds],
        { kind: "uups" },
      );

      console.log("2");

      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
      const secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      deployedWETH = new ethers.Contract(
        wethAddress,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]`,
        ethers.provider,
      );

      console.log("3");

      // approve WETH
      await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);
      await deployedWETH.connect(second).approve(deployedGenesisKey.address, MAX_UINT);

      console.log("4");

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

      console.log("5");

      const genesisKeyBid2 = await getDigest(
        ethers.provider,
        "NFT.com Genesis Key",
        deployedGenesisKey.address,
        getHash(
          ["bytes32", "uint256", "address"],
          [GENESIS_KEY_TYPEHASH, convertSmallNumber(2), secondSigner.address], // 1 WETH
        ),
      );

      console.log("owner WETH: ", Number(await deployedWETH.balanceOf(owner.address)) / 10 ** 18);
      console.log("second WETH: ", Number(await deployedWETH.balanceOf(second.address)) / 10 ** 18);

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

      console.log("6");

      // owner now has 1 genesis key
      await deployedGenesisKey.connect(owner).claimKey(convertBigNumber(1), ownerSigner.address, v0, r0, s0);

      console.log("7");

      // second now has 1 genesis key
      await deployedGenesisKey.connect(second).claimKey(convertSmallNumber(2), secondSigner.address, v1, r1, s1);

      console.log("8");

      NftStake = await ethers.getContractFactory("GenesisNftStake");
      deployedNftGenesisStake = await NftStake.deploy(
        deployedNftToken.address,
        RINKEBY_WETH,
        deployedGenesisKey.address,
      );

      await owner.sendTransaction({ to: addr1.address, value: convertSmallNumber(1) });
      await deployedWETH.connect(addr1).transfer(ownerSigner.address, await deployedWETH.balanceOf(addr1.address));
    });

    describe("Genesis Key Staking Contract Pool", async function () {
      it("should allow users to increase allowance with permit", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        let deadline = currentTime + 100;
        const nftTokenPermitDigest = await getDigest(
          ethers.provider,
          "NFT.com",
          deployedNftToken.address,
          getHash(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftGenesisStake.address, 1000, 0, deadline],
          ),
        );

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftGenesisStake.address)).to.be.equal(0);

        const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

        await deployedNftToken.permit(ownerSigner.address, deployedNftGenesisStake.address, 1000, deadline, v0, r0, s0);
        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftGenesisStake.address)).to.be.equal(
          1000,
        );
      });

      it("should revert on staking with invalid signature", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
        let deadline = currentTime + 100;
        const nftTokenPermitDigest = await getDigest(
          ethers.provider,
          "NFT.com",
          deployedNftToken.address,
          getHash(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftGenesisStake.address, 1000, 0, deadline],
          ),
        );

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftGenesisStake.address)).to.be.equal(0);

        const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

        await expect(deployedNftGenesisStake.enter(1000, v0, r0, r0)).to.be.reverted;
      });

      it("should allow genesis staking and unstaking nft token with valid signature", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        const nftTokenPermitDigest = await getDigest(
          ethers.provider,
          "NFT.com",
          deployedNftToken.address,
          getHash(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftGenesisStake.address, MAX_UINT, 0, MAX_UINT],
          ),
        );

        await owner.sendTransaction({ to: ownerSigner.address, value: BigNumber.from(10).pow(BigNumber.from(18)) });

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftGenesisStake.address)).to.be.equal(0);

        const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

        await deployedGenesisKey.approve(deployedNftGenesisStake.address, 0);

        // reverts since owner does not own genesis key tokenId = 1
        await expect(deployedNftGenesisStake.connect(owner).enter(1000, 1, v0, r0, s0)).to.be.reverted;

        // make sure owner owns token Id 0
        expect(await deployedGenesisKey.ownerOf(0)).to.be.equal(owner.address);

        // succeeds since owner owns genesis key tokenId = 0
        await expect(deployedNftGenesisStake.connect(owner).enter(1000, 0, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(ownerSigner.address, deployedNftGenesisStake.address, 1000);

        // key is now staked as well
        expect(await deployedGenesisKey.ownerOf(0)).to.be.equal(deployedNftGenesisStake.address);
        expect(await deployedNftGenesisStake.stakedKeys(0)).to.be.equal(owner.address);
        expect(await deployedNftGenesisStake.stakedAddress(owner.address)).to.be.equal(1);

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("9999999999999999999999999000");
        expect(await deployedNftToken.balanceOf(deployedNftGenesisStake.address)).to.be.equal(1000);
        expect(await deployedNftGenesisStake.balanceOf(ownerSigner.address)).to.be.equal(1000);

        await expect(deployedNftGenesisStake.connect(owner).leave(1000, 1)).to.be.reverted;

        await expect(deployedNftGenesisStake.connect(owner).leave(1000, 0))
          .to.emit(deployedNftGenesisStake, "Transfer")
          .withArgs(ownerSigner.address, ethers.constants.AddressZero, 1000);

        expect(await deployedGenesisKey.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftGenesisStake.stakedKeys(0)).to.be.equal(ethers.constants.AddressZero);
        expect(await deployedNftGenesisStake.stakedAddress(owner.address)).to.be.equal(0);
      });

      it("should allow staking users to receive additional NFT tokens as yield", async function () {
        const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

        const nftTokenPermitDigest = await getDigest(
          ethers.provider,
          "NFT.com",
          deployedNftToken.address,
          getHash(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftGenesisStake.address, MAX_UINT, 0, MAX_UINT],
          ),
        );

        await owner.sendTransaction({ to: ownerSigner.address, value: BigNumber.from(10).pow(BigNumber.from(18)) });

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftGenesisStake.address)).to.be.equal(0);

        const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

        await deployedGenesisKey.approve(deployedNftGenesisStake.address, 0);

        await expect(deployedNftGenesisStake.connect(owner).enter(1000, 0, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(ownerSigner.address, deployedNftGenesisStake.address, 1000);

        await deployedNftToken.connect(owner).transfer(deployedNftGenesisStake.address, 5000);

        await expect(deployedNftGenesisStake.connect(owner).leave(1000, 0))
          .to.emit(deployedNftGenesisStake, "Transfer")
          .withArgs(ownerSigner.address, ethers.constants.AddressZero, 1000);

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
