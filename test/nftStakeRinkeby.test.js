const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH } = require("./utils/sign-utils");

describe("NFT Token Staking", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftStake;
    const MAX_UINT = (BigNumber.from(2).pow(BigNumber.from(256))).sub(1);
    const NFT_RINKEBY_ADDRESS = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.attach(NFT_RINKEBY_ADDRESS);

      // deploy staking contract with the correct rinkeby testnet address
      NftStake = await ethers.getContractFactory("NftStake");
      deployedNftStake = await NftStake.deploy(NFT_RINKEBY_ADDRESS, RINKEBY_WETH);
    });

    it("should allow a user to test swap ETH for NFT coins on Uniswap V3", async function () {
      // send 1 ETH to NftStake contract to simulate eth fees being accrued
      await owner.sendTransaction({ to: deployedNftStake.address, value: BigNumber.from(10).pow(BigNumber.from(18)) });

      // no NFT tokens before trading
      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(0);

      await deployedNftStake.convertEthToNFT();

      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.not.be.equal(0);

      console.log('New NFT: ', Number(newBalance) / 10 ** 18);      
    });

    it("should allow a user to test swap WETH (or arbitrary ERC20) for NFT coins on Uniswap V3", async function () {
      // approve WETH
      await deployedNftStake.approveToken(RINKEBY_WETH);

      // no NFT tokens before trading
      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(0);

      await deployedNftStake.convertERC20ToNFT(RINKEBY_WETH);

      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.not.be.equal(0);

      console.log('New NFT: ', Number(newBalance) / 10 ** 18);      
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
