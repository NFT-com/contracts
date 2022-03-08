const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const {
  sign,
  getDigest,
  getHash,
  convertToHash,
  ERC20_PERMIT_TYPEHASH,
  ETH_ASSET_CLASS,
  signMarketplaceOrder,
  ERC20_ASSET_CLASS,
  ERC721_ASSET_CLASS,
  ERC1155_ASSET_CLASS,
  CRYPTO_KITTY,
  COLLECTION,
  getAssetHash,
  makeSalt,
  encode,
  MARKETPLACE_ORDER_TYPEHASH,
} = require("./utils/sign-utils");

// whole number
const convertNftToken = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

const convertSmallNftToken = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(16)));
};

const AuctionType = {
  FixedPrice: 0,
  English: 1,
  Decreasing: 2,
};

describe("NFT.com Marketplace", function () {
  try {
    let NftMarketplace,
      NftTransferProxy,
      CryptoKittyTransferProxy,
      ERC20TransferProxy,
      NftToken,
      NftStake,
      GenesisStake,
      NftBuyer,
      GenesisKey,
      ERC1155Factory;
    let deployedNftMarketplace,
      deployedNftTransferProxy,
      deployedCryptoKittyTransferProxy,
      deployedERC20TransferProxy,
      deployedNftToken,
      deployedTest721,
      deployedNftStake,
      deployedNftBuyer,
      deployedWETH,
      deployedGenesisStake,
      deployedUniV2Router,
      deployedXEENUS,
      deployedGenesisKey,
      deployedERC1155Factory;
    let ownerSigner, buyerSigner;

    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const RINEKBY_XEENUS = "0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c";
    const RINKEBY_FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const RINKEBY_ROUTER_V2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftMarketplace = await ethers.getContractFactory("NftMarketplace");
      NftStake = await ethers.getContractFactory("PublicNftStake");
      GenesisStake = await ethers.getContractFactory("GenesisNftStake");
      NftBuyer = await ethers.getContractFactory("NftBuyer");
      NftTransferProxy = await ethers.getContractFactory("NftTransferProxy");
      ERC20TransferProxy = await ethers.getContractFactory("ERC20TransferProxy");
      CryptoKittyTransferProxy = await ethers.getContractFactory("CryptoKittyTransferProxy");
      ERC1155Factory = await ethers.getContractFactory("TestERC1155");

      deployedXEENUS = new ethers.Contract(
        RINEKBY_XEENUS,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"drip","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}]`,
        ethers.provider,
      );

      deployedUniV2Router = new ethers.Contract(
        RINKEBY_ROUTER_V2,
        `[{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"amountADesired","type":"uint256"},{"internalType":"uint256","name":"amountBDesired","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountTokenDesired","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"},{"internalType":"uint256","name":"liquidity","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountIn","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsIn","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"reserveA","type":"uint256"},{"internalType":"uint256","name":"reserveB","type":"uint256"}],"name":"quote","outputs":[{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETH","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityETHSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermit","outputs":[{"internalType":"uint256","name":"amountToken","type":"uint256"},{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountTokenMin","type":"uint256"},{"internalType":"uint256","name":"amountETHMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityETHWithPermitSupportingFeeOnTransferTokens","outputs":[{"internalType":"uint256","name":"amountETH","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint256","name":"liquidity","type":"uint256"},{"internalType":"uint256","name":"amountAMin","type":"uint256"},{"internalType":"uint256","name":"amountBMin","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"approveMax","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"removeLiquidityWithPermit","outputs":[{"internalType":"uint256","name":"amountA","type":"uint256"},{"internalType":"uint256","name":"amountB","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapETHForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForTokensSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactETH","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]`,
        ethers.provider,
      );

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy();

      // the NFT profile is used for testing purposes as a random NFT being traded
      Test721 = await ethers.getContractFactory("Test721");
      deployedTest721 = await Test721.deploy();

      deployedERC1155Factory = await ERC1155Factory.deploy();

      [owner, buyer, addr2, ...addrs] = await ethers.getSigners();

      const name = "NFT.com Genesis Key";
      const symbol = "NFTKEY";
      const multiSig = buyer.address;
      const auctionSeconds = "604800"; // seconds in 1 week
      ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
      buyerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

      deployedGenesisKey = await hre.upgrades.deployProxy(
        GenesisKey,
        [name, symbol, RINKEBY_WETH, multiSig, auctionSeconds],
        { kind: "uups" },
      );

      deployedNftStake = await NftStake.deploy(deployedNftToken.address);
      deployedGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKey.address);

      deployedWETH = new ethers.Contract(
        RINKEBY_WETH,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]`,
        ethers.provider,
      );

      deployedNftBuyer = await NftBuyer.deploy(
        RINKEBY_FACTORY_V2,
        deployedNftStake.address,
        deployedGenesisStake.address,
        deployedNftToken.address,
        RINKEBY_WETH,
      );
      deployedNftTransferProxy = await upgrades.deployProxy(NftTransferProxy, { kind: "uups" });
      deployedERC20TransferProxy = await upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
      deployedCryptoKittyTransferProxy = await upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });

      deployedNftMarketplace = await upgrades.deployProxy(
        NftMarketplace,
        [
          deployedNftTransferProxy.address,
          deployedERC20TransferProxy.address,
          deployedCryptoKittyTransferProxy.address,
          deployedNftBuyer.address,
          deployedNftToken.address,
        ],
        { kind: "uups" },
      );

      await deployedNftMarketplace.setTransferProxy(ERC20_ASSET_CLASS, deployedERC20TransferProxy.address);

      // add operator being the marketplace
      await deployedNftTransferProxy.addOperator(deployedNftMarketplace.address);
      await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
      await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

      await deployedTest721.connect(owner).mint(0);
      await deployedTest721.connect(owner).mint(1);
      await deployedTest721.connect(owner).mint(2);
      await deployedTest721.connect(owner).mint(3);
      await deployedTest721.connect(owner).mint(4);
      await deployedTest721.connect(owner).mint(5);

      expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
      expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
      expect(await deployedTest721.ownerOf(2)).to.be.equal(owner.address);
      expect(await deployedTest721.ownerOf(3)).to.be.equal(owner.address);
      expect(await deployedTest721.ownerOf(4)).to.be.equal(owner.address);
      expect(await deployedTest721.ownerOf(5)).to.be.equal(owner.address);
    });

    describe("Initialize Marketplace", function () {
      it("should encode VRS into bytes65 signature", async function () {
        const v = 28;
        const r = "0x8fbf2bcdc98d8ceea20e1c9e6c3237ff9d8536a813a7166a5a5ce4411eee9fb9";
        const s = "0x2a6cb9a6e2a74fd3b3689b14e004c8b6bb65a83f79ce617af2d4befbe26ac6ff";

        let sig = await deployedNftMarketplace.concatVRS(v, r, s);
        let decoded = await deployedNftMarketplace.recoverVRS(sig);

        // revert due to size of sig != 65
        await expect(deployedNftMarketplace.recoverVRS(getHash(["uint256"], [1000]))).to.be.reverted;

        expect(decoded[0]).to.be.equal(v);
        expect(decoded[1]).to.be.equal(r);
        expect(decoded[2]).to.be.equal(s);
      });

      it("should test adding and removing operators", async function () {
        // add and remove
        await deployedERC20TransferProxy.addOperator(owner.address);
        await deployedERC20TransferProxy.removeOperator(owner.address);

        await deployedNftTransferProxy.addOperator(owner.address);
        await deployedNftTransferProxy.removeOperator(owner.address);

        await deployedCryptoKittyTransferProxy.addOperator(owner.address);
        await deployedCryptoKittyTransferProxy.removeOperator(owner.address);
      });
    });

    describe("Allow Multi-Asset Swaps via EOA users using sigV4", function () {
      it("should catch edge cases for start and end times", async function () {
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          9999999999,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        // should be false since order.start < now
        await expect(deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.reverted;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: sellOrder2,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          3,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        // should be false since order.end > now
        await expect(deployedNftMarketplace.validateOrder_(sellOrder2, v1, r1, s1)).to.be.reverted;
      });

      it("should execute buy nows", async function () {
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        // send 1000 tokens to buyer
        await deployedNftToken
          .connect(owner)
          .transfer(buyer.address, BigNumber.from(1000).mul(BigNumber.from(10).pow(BigNumber.from(18))));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);

        await expect(deployedNftMarketplace.connect(buyer).buyNow(sellOrder, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyer.address, ownerSigner.address, convertNftToken(100));

        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftToken.balanceOf(buyer.address)).to.be.equal(
          BigNumber.from(8995).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );
        expect(await deployedNftToken.balanceOf(deployedNftBuyer.address)).to.be.equal(
          BigNumber.from(5).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
      });

      it("should allow fixed price auctions", async function () {
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(100)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.FixedPrice,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        // send 1000 tokens to buyer
        await deployedNftToken
          .connect(owner)
          .transfer(buyer.address, BigNumber.from(1000).mul(BigNumber.from(10).pow(BigNumber.from(18))));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);

        await expect(deployedNftMarketplace.connect(buyer).buyNow(sellOrder, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyer.address, ownerSigner.address, convertNftToken(100));

        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftToken.balanceOf(buyer.address)).to.be.equal(
          BigNumber.from(8995).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );
        expect(await deployedNftToken.balanceOf(deployedNftBuyer.address)).to.be.equal(
          BigNumber.from(5).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );

        // reset board
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(100));
      });

      it("should allow decreasing price auctions", async function () {
        const startTime = Math.floor(new Date().getTime() / 1000) - 3600;
        const endTime = startTime + 3600 * 10;

        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(0)]]],
          startTime,
          endTime,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.Decreasing,
        );

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        console.log("decreasingPrice: ", Number(await deployedNftMarketplace.getDecreasingPrice(sellOrder)));

        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);

        await deployedNftMarketplace.connect(buyer).buyNow(sellOrder, v0, r0, s0);

        // reset board
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(100));
      });

      it("should execute matched swaps using buy / sell orders", async function () {
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]]],
          owner.address,
          [[ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // send 1000 tokens to buyerSigner
        await deployedNftToken.connect(owner).transfer(buyerSigner.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);

        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);

        // should revert due to owner != buyOrder.maker
        await expect(deployedNftMarketplace.connect(owner).approveOrder_(buyOrder)).to.be.reverted;

        // should succeed
        await deployedNftMarketplace.connect(buyer).approveOrder_(buyOrder);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        await deployedNftMarketplace.cancel(sellOrder);

        // false because sellOrder already executed and cancelled
        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v1, r1, s1))[0]).to.be.false;

        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyerSigner.address);
        expect(await deployedNftToken.balanceOf(deployedNftBuyer.address)).to.be.equal(
          BigNumber.from(25).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );

        // reverts due to > 2000
        await expect(deployedNftMarketplace.connect(owner).changeProtocolFee(2001)).to.be.reverted;

        await deployedNftMarketplace.connect(owner).changeProtocolFee(250);

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
      });

      it("should cancel order with wrong nonce", async function () {
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]]],
          owner.address,
          [[ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // send 1000 tokens to buyerSigner
        await deployedNftToken.connect(owner).transfer(buyerSigner.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);

        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);

        // should revert due to owner != buyOrder.maker
        await expect(deployedNftMarketplace.connect(owner).approveOrder_(buyOrder)).to.be.reverted;

        // should succeed
        await deployedNftMarketplace.connect(buyer).approveOrder_(buyOrder);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        await deployedNftMarketplace.connect(owner).incrementNonce();

        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        ).to.be.reverted;

        // false because sellOrder already executed and cancelled
        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v1, r1, s1))[0]).to.be.false;
      });

      it("should allow multi-asset swaps", async function () {
        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINKEBY_WETH, true);

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]]],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);

        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should allow more complicated multi-asset swaps", async function () {
        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINEKBY_XEENUS, true);

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should allow more mixed multi-asset swaps (ERC20 + 721) <=> (721 + ERC20 + ETH)", async function () {
        // transfer profile back to buyer for this exchange
        await deployedTest721.connect(owner).transferFrom(owner.address, buyer.address, 1);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINEKBY_XEENUS, true);

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]],
          ],
          ethers.constants.AddressZero,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 1], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(owner).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(buyer).approve(deployedNftTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(buyer.address);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedXEENUS.balanceOf(buyer.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(500)),
        );

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
      });

      it("should allow optional assets and arbitrary tokenIds for NFTs", async function () {
        // transfer both profiles to buyer
        await deployedTest721.connect(owner).transferFrom(owner.address, buyer.address, 1);
        await deployedTest721.connect(owner).transferFrom(owner.address, buyer.address, 0);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINEKBY_XEENUS, true);

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]]],
          ethers.constants.AddressZero,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values, false means tokenId agnostic
              [1, 1], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]], // send tokenid 1 bc agnostic
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
          ],
          owner.address,
          [[ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(owner).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(buyer).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(buyer).approve(deployedNftTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(buyer.address);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedXEENUS.balanceOf(buyer.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(500)),
        );

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedXEENUS.connect(buyer).transfer(owner.address, convertNftToken(500));
      });

      it("should allow valid eth swaps and convert fees to NFT coin", async function () {
        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINEKBY_XEENUS, true);
        await owner.sendTransaction({ to: buyer.address, value: convertNftToken(2) });

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
            [
              ETH_ASSET_CLASS,
              ["address"],
              [ethers.constants.AddressZero],
              [convertSmallNftToken(2), convertSmallNftToken(1)],
            ],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertSmallNftToken(1), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );
        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: incorrect_v2,
          r: incorrect_r2,
          s: incorrect_s2,
          order: incorrect_sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), convertNftToken(1)]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect(
          (
            await deployedNftMarketplace.validateOrder_(incorrect_sellOrder, incorrect_v2, incorrect_r2, incorrect_s2)
          )[0],
        ).to.be.true;

        const {
          v: incorrect_v3,
          r: incorrect_r3,
          s: incorrect_s3,
          order: incorrect_buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect(
          (
            await deployedNftMarketplace.validateOrder_(incorrect_buyOrder, incorrect_v3, incorrect_r3, incorrect_s3)
          )[0],
        ).to.be.true;

        // should revert because eth is used twice
        await expect(deployedNftMarketplace.validateMatch_(incorrect_sellOrder, incorrect_buyOrder)).to.be.reverted;

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);

        // should revert because only buyer can call and send in msg.value
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        ).to.be.reverted;

        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1500));
        const beforeEthBalance = await ethers.provider.getBalance(owner.address);

        // succeeds because buyer is calling and sending in ETH
        await expect(
          deployedNftMarketplace.connect(buyer).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        // buyer should have sent 2 ETH, and received 1 ETH back
        expect(await ethers.provider.getBalance(deployedNftBuyer.address)).to.be.equal(
          convertSmallNftToken(1).mul(100).div(10000),
        );
        // contract should have 0 ETH
        expect(await ethers.provider.getBalance(deployedNftMarketplace.address)).to.be.equal(0);
        // owner should have received 1 ETH
        expect(await ethers.provider.getBalance(owner.address)).to.be.equal(
          beforeEthBalance.add(convertSmallNftToken(1)),
        );

        // nftBuyer
        const deployedNftBuyerETH = await ethers.provider.getBalance(deployedNftBuyer.address);
        console.log("========> deployedNftBuyerETH: ", Number(deployedNftBuyerETH) / 10 ** 18);
        const deployedNftBuyerWETH = await deployedWETH.balanceOf(deployedNftBuyer.address);
        console.log("========> deployedNftBuyerWETH: ", Number(deployedNftBuyerWETH) / 10 ** 18);
        const deployedNftBuyerNftBalance = await deployedNftToken.balanceOf(deployedNftBuyer.address);
        console.log("========> deployedNftBuyerNftBalance: ", Number(deployedNftBuyerNftBalance) / 10 ** 18);
        const deployedNftBuyerXEENUS = await deployedXEENUS.balanceOf(deployedNftBuyer.address);
        console.log("========> deployedNftBuyerXEENUS: ", Number(deployedNftBuyerXEENUS) / 10 ** 18);

        // no funds yet
        expect(await deployedNftToken.balanceOf(deployedGenesisStake.address)).to.be.equal(0);
        expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(0);
        expect(await deployedWETH.balanceOf(deployedNftBuyer.address)).to.be.equal(0);

        expect(await deployedNftBuyer.publicStakingPercent()).to.be.equal(5000);
        await expect(deployedNftBuyer.connect(owner).changePublicPercent(10001)).to.be.reverted;
        await deployedNftBuyer.connect(owner).changePublicPercent(5000);
        expect(await deployedNftBuyer.publicStakingPercent()).to.be.equal(5000);

        await deployedNftBuyer.connect(owner).convertETH();

        // UNIV2 POOL FUNDING
        await deployedNftToken.connect(owner).approve(deployedUniV2Router.address, MAX_UINT);
        await deployedXEENUS.connect(owner).approve(deployedUniV2Router.address, MAX_UINT);
        await deployedUniV2Router
          .connect(owner)
          .addLiquidity(
            RINKEBY_WETH,
            deployedNftToken.address,
            convertNftToken(1),
            convertNftToken(1000),
            convertNftToken(1),
            convertNftToken(1000),
            owner.address,
            Math.floor(new Date().getTime() / 1000) + 3600,
          );

        // WETH -> ETH
        expect(await deployedWETH.balanceOf(deployedNftBuyer.address)).to.be.equal(deployedNftBuyerETH);

        await deployedNftBuyer.connect(owner).convert(RINKEBY_WETH);

        expect(await deployedWETH.balanceOf(deployedNftBuyer.address)).to.be.equal(0);
        expect(await deployedXEENUS.balanceOf(deployedNftBuyer.address)).to.be.gt(0);

        await deployedNftBuyer.connect(owner).convert(RINEKBY_XEENUS);

        expect(await deployedXEENUS.balanceOf(deployedNftBuyer.address)).to.be.equal(0);

        expect(await deployedNftToken.balanceOf(deployedGenesisStake.address)).to.be.gt(0);
        console.log(
          "deployedNftToken.balanceOf(deployedGenesisStake.address): ",
          Number(await deployedNftToken.balanceOf(deployedGenesisStake.address)) / 10 ** 18,
        );
        expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.gt(0);
        console.log(
          "deployedNftToken.balanceOf(deployedNftStake.address): ",
          Number(await deployedNftToken.balanceOf(deployedNftStake.address)) / 10 ** 18,
        );
        expect(await deployedWETH.balanceOf(deployedNftBuyer.address)).to.be.equal(0);

        // reset board
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 1);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(500));
        await deployedXEENUS.connect(buyer).transfer(owner.address, convertNftToken(400)); // return some funds
      });

      it("should allow cryptokitties and 1155s to be traded", async function () {
        const KittyCore = await ethers.getContractFactory("KittyCore");
        const deployedKittyCore = await KittyCore.deploy();

        await deployedKittyCore.createPromoKitty(1, owner.address);

        await deployedERC1155Factory.mint(buyer.address, 0, 100, "hello");
        await deployedERC1155Factory.mint(owner.address, 1, 150, "hello");

        // sanity check to make sure balances are correct
        expect(await deployedERC1155Factory.balanceOf(buyer.address, 0)).to.be.equal(100);
        expect(await deployedERC1155Factory.balanceOf(buyer.address, 1)).to.be.equal(0);
        expect(await deployedERC1155Factory.balanceOf(owner.address, 1)).to.be.equal(150);
        expect(await deployedERC1155Factory.balanceOf(owner.address, 0)).to.be.equal(0);

        // only two kitties shold exist
        // since first one is minted during constructor for kittyCore
        expect(await deployedKittyCore.kittyIndexToOwner(0)).to.be.equal(ethers.constants.AddressZero);
        expect(await deployedKittyCore.kittyIndexToOwner(1)).to.be.equal(owner.address);

        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINEKBY_XEENUS, true);
        await owner.sendTransaction({ to: buyer.address, value: convertNftToken(2) });

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
            [
              CRYPTO_KITTY, // asset class
              ["address", "uint256", "bool"], // types
              [deployedKittyCore.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC1155_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedERC1155Factory.address, 1, true], // values
              [150, 0], // would like to sell 150 tokens with id 0
            ],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(2), convertNftToken(1)]],
            [
              ERC1155_ASSET_CLASS,
              ["address", "uint256", "bool"],
              [deployedERC1155Factory.address, 0, false],
              [100, 75],
            ],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
            [ERC1155_ASSET_CLASS, ["address", "uint256", "bool"], [deployedERC1155Factory.address, 0, false], [80, 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
            [CRYPTO_KITTY, ["address", "uint256", "bool"], [deployedKittyCore.address, 1, true], [1, 0]],
            [ERC1155_ASSET_CLASS, ["address", "uint256", "bool"], [deployedERC1155Factory.address, 1, true], [150, 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 1);

        // approve 1155
        await deployedERC1155Factory.connect(owner).setApprovalForAll(deployedNftTransferProxy.address, true);
        await deployedERC1155Factory.connect(buyer).setApprovalForAll(deployedNftTransferProxy.address, true);

        // approve crypto kitty to be transfer
        await deployedKittyCore.connect(owner).approve(deployedCryptoKittyTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);

        // should revert because only buyer can call and send in msg.value
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        ).to.be.reverted;

        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));
        const beforeEthBalance = await ethers.provider.getBalance(owner.address);

        // succeeds because buyer is calling and sending in ETH
        await expect(
          deployedNftMarketplace.connect(buyer).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // new owner of kitty 1 should be buyer
        expect(await deployedKittyCore.kittyIndexToOwner(1)).to.be.equal(buyer.address);

        // sanity check to make sure balances are correct for test 1155
        expect(await deployedERC1155Factory.balanceOf(buyer.address, 0)).to.be.equal(20);
        expect(await deployedERC1155Factory.balanceOf(buyer.address, 1)).to.be.equal(150);
        expect(await deployedERC1155Factory.balanceOf(owner.address, 1)).to.be.equal(0);
        expect(await deployedERC1155Factory.balanceOf(owner.address, 0)).to.be.equal(80);

        // balances after
        expect(await deployedTest721.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        // buyer should have sent 2 ETH, and received 1 ETH back
        expect(await ethers.provider.getBalance(deployedNftBuyer.address)).to.be.equal(
          convertNftToken(1).mul(100).div(10000),
        );
        // contract should have 0 ETH
        expect(await ethers.provider.getBalance(deployedNftMarketplace.address)).to.be.equal(0);
        // owner should have received 1 ETH
        expect(await ethers.provider.getBalance(owner.address)).to.be.equal(beforeEthBalance.add(convertNftToken(1)));

        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedTest721.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should not allow swaps with insufficient nft token", async function () {
        await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
        await deployedNftMarketplace.modifyWhitelist(RINKEBY_WETH, true);

        // sell NFT profile NFT token 0 and 1
        // wants NFT token and WETH
        const {
          v: v0,
          r: r0,
          s: s0,
          order: sellOrder,
        } = await signMarketplaceOrder(
          ownerSigner,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [deployedTest721.address, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0))[0]).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(9), 0]]],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedTest721.address, 1, true], [1, 0]],
          ],
          0,
          0,
          await deployedNftMarketplace.nonces(owner.address),
          ethers.provider,
          deployedNftMarketplace.address,
          AuctionType.English,
        );

        expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 0);
        await deployedTest721.connect(owner).approve(deployedNftTransferProxy.address, 1);

        // match is invalid since NFT token bid doesn't meet minimum desired
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.false;

        // balances before
        expect(await deployedTest721.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedTest721.ownerOf(1)).to.be.equal(owner.address);

        // swap should fail
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        ).to.be.reverted;
      });
    });

    describe("Protocol Upgrades", function () {
      it("should upgrade profile contract to V2", async function () {
        const NftMarketplaceV2 = await ethers.getContractFactory("NftMarketplaceV2");

        let deployedNftMarketplaceV2 = await upgrades.upgradeProxy(deployedNftMarketplace.address, NftMarketplaceV2);

        expect(await deployedNftMarketplaceV2.getVariable()).to.be.equal("hello");

        expect(await deployedNftMarketplaceV2.testFunction()).to.be.equal(12345);
      });
    });
  } catch (err) {
    console.log("NFT Marketplace error: ", err);
  }
});
