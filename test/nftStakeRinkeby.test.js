const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH } = require("./utils/sign-utils");

describe("NFT Token Staking (Rinkeby)", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftStake, deployedXEENUS;
    const NFT_RINKEBY_ADDRESS = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const RINEKBY_XEENUS = "0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.attach(NFT_RINKEBY_ADDRESS);
      deployedXEENUS = new ethers.Contract(
        RINEKBY_XEENUS,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"drip","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}]`,
        ethers.provider
      );

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

      let newBalance = await deployedNftToken.balanceOf(deployedNftStake.address);
      expect(newBalance).to.not.be.equal(0);

      console.log('1 ETH swap: ', Number(newBalance) / 10 ** 18);
    });

    it("should allow a user to test swap XEENUS (or arbitrary ERC20) for NFT coins on Uniswap V3", async function () {
      expect(await deployedXEENUS.balanceOf(deployedNftStake.address)).to.be.equal(0);

      // send 100 XEENUS to contract
      await deployedXEENUS.connect(owner).transfer(deployedNftStake.address, BigNumber.from(10).pow(BigNumber.from(20)));

      expect(await deployedXEENUS.balanceOf(deployedNftStake.address)).to.be.equal(BigNumber.from(10).pow(BigNumber.from(20)));

      // approve XEENUS
      await deployedNftStake.approveToken(RINEKBY_XEENUS);

      // no NFT tokens before trading
      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(0);

      await deployedNftStake.convertERC20ToNFT(RINEKBY_XEENUS);

      expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.not.be.equal(0);   

      let newBalance = await deployedNftToken.balanceOf(deployedNftStake.address);
      console.log('100 XEENUS swap: ', Number(newBalance) / 10 ** 18);
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
