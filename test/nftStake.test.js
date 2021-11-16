const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH } = require("./utils/sign-utils");

describe("NFT Token Staking (Localnet)", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftStake;
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy(); // mint 10B tokens

      NftStake = await ethers.getContractFactory("NftStake");
      deployedNftStake = await NftStake.deploy(deployedNftToken.address, RINKEBY_WETH);
    });

    describe("Test Staking and Unstaking", function () {
      it("deployment should assign the total supply of tokens to the owner", async function () {
        const ownerBalance = await deployedNftToken.balanceOf(owner.address);
        expect(await deployedNftToken.totalSupply()).to.equal(ownerBalance);
      });

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
            [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftStake.address, 1000, 0, deadline],
          ),
        );

        expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftStake.address)).to.be.equal(0);

        const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

        await deployedNftToken.permit(ownerSigner.address, deployedNftStake.address, 1000, deadline, v0, r0, s0);
        expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftStake.address)).to.be.equal(1000);
      });
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
          [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftStake.address, 1000, 0, deadline],
        ),
      );

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

      expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftStake.address)).to.be.equal(0);

      const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

      await expect(deployedNftStake.enter(1000, v0, r0, r0)).to.be.reverted;
    });

    it("should allow staking and unstaking nft token with valid signature", async function () {
      const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

      const nftTokenPermitDigest = await getDigest(
        ethers.provider,
        "NFT.com",
        deployedNftToken.address,
        getHash(
          ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
          [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftStake.address, MAX_UINT, 0, MAX_UINT],
        ),
      );

      await owner.sendTransaction({ to: ownerSigner.address, value: BigNumber.from(10).pow(BigNumber.from(18)) });

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

      expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftStake.address)).to.be.equal(0);

      const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

      await expect(deployedNftStake.connect(ownerSigner.connect(ethers.provider)).enter(1000, v0, r0, s0))
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(ownerSigner.address, deployedNftStake.address, 1000);

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("9999999999999999999999999000");
      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(1000);
      expect(await deployedNftStake.balanceOf(ownerSigner.address)).to.be.equal(1000);

      await expect(deployedNftStake.connect(ownerSigner.connect(ethers.provider)).leave(1000))
        .to.emit(deployedNftStake, "Transfer")
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
          [ERC20_PERMIT_TYPEHASH, ownerSigner.address, deployedNftStake.address, MAX_UINT, 0, MAX_UINT],
        ),
      );

      await owner.sendTransaction({ to: ownerSigner.address, value: BigNumber.from(10).pow(BigNumber.from(18)) });

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");

      expect(await deployedNftToken.allowance(ownerSigner.address, deployedNftStake.address)).to.be.equal(0);

      const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, ownerSigner);

      await expect(deployedNftStake.connect(ownerSigner.connect(ethers.provider)).enter(1000, v0, r0, s0))
        .to.emit(deployedNftToken, "Transfer")
        .withArgs(ownerSigner.address, deployedNftStake.address, 1000);

      await deployedNftToken.connect(owner).transfer(deployedNftStake.address, 5000);

      await expect(deployedNftStake.connect(ownerSigner.connect(ethers.provider)).leave(1000))
        .to.emit(deployedNftStake, "Transfer")
        .withArgs(ownerSigner.address, ethers.constants.AddressZero, 1000);

      expect(await deployedNftToken.balanceOf(ownerSigner.address)).to.be.equal("10000000000000000000000000000");
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
