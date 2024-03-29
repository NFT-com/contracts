const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { convertTinyNumber, sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH } = require("./utils/sign-utils");

describe("NFT Token Genesis Staking (Localnet)", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftGenesisStake;
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

    let GenesisKey;
    let deployedGenesisKey;
    let deployedWETH;
    let GenesisKeyTeamClaim;
    let deployedGenesisKeyTeamClaim;
    let GenesisKeyTeamDistributor;
    const name = "NFT.com Genesis Key";
    const symbol = "GENESISKEY";
    const auctionSeconds = "604800"; // seconds in 1 week

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy(); // mint 10B tokens

      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
      const multiSig = addr1.address;

      deployedWETH = await NftToken.deploy();
      wethAddress = deployedWETH.address;

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, multiSig, auctionSeconds, true, "ipfs://"],
        { kind: "uups" },
      );

      GenesisKeyTeamClaim = await ethers.getContractFactory("GenesisKeyTeamClaim");
      deployedGenesisKeyTeamClaim = await upgrades.deployProxy(GenesisKeyTeamClaim, [deployedGenesisKey.address], {
        kind: "uups",
      });

      GenesisKeyTeamDistributor = await ethers.getContractFactory("GenesisKeyTeamDistributor");
      deployedGkTeamDistributor = await GenesisKeyTeamDistributor.deploy(deployedGenesisKeyTeamClaim.address);

      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
      const secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      // approve WETH
      await deployedWETH.connect(owner).approve(deployedGenesisKey.address, MAX_UINT);
      await deployedWETH.connect(second).approve(deployedGenesisKey.address, MAX_UINT);
      await deployedWETH.connect(owner).transfer(second.address, convertTinyNumber(2));

      await deployedGenesisKey.connect(owner).mintKey(owner.address);
      await deployedGenesisKey.connect(owner).mintKey(secondSigner.address);

      NftStake = await ethers.getContractFactory("NftStake");
      deployedNftGenesisStake = await NftStake.deploy(deployedNftToken.address);

      await owner.sendTransaction({ to: addr1.address, value: convertTinyNumber(1) });

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

        await deployedGenesisKey.approve(deployedNftGenesisStake.address, 1);

        // make sure owner owns token Id 1
        expect(await deployedGenesisKey.ownerOf(1)).to.be.equal(owner.address);

        // succeeds since owner owns genesis key tokenId = 1
        await expect(deployedNftGenesisStake.connect(owner).enter(1000, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(ownerSigner.address, deployedNftGenesisStake.address, 1000);

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("9999999999999999999999999000");
        expect(await deployedNftToken.balanceOf(deployedNftGenesisStake.address)).to.be.equal(1000);
        expect(await deployedNftGenesisStake.balanceOf(ownerSigner.address)).to.be.equal(1000);

        await expect(deployedNftGenesisStake.connect(owner).leave(1000))
          .to.emit(deployedNftGenesisStake, "Transfer")
          .withArgs(ownerSigner.address, ethers.constants.AddressZero, 1000);
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

        await deployedGenesisKey.approve(deployedNftGenesisStake.address, 1);

        await expect(deployedNftGenesisStake.connect(owner).enter(1000, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(ownerSigner.address, deployedNftGenesisStake.address, 1000);

        await deployedNftToken.connect(owner).transfer(deployedNftGenesisStake.address, 5000);

        await expect(deployedNftGenesisStake.connect(owner).leave(1000))
          .to.emit(deployedNftGenesisStake, "Transfer")
          .withArgs(ownerSigner.address, ethers.constants.AddressZero, 1000);

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
