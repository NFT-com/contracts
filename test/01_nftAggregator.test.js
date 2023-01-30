const { expect } = require("chai");
const looksrareABI = require("../abis/looksrare.json");
const seaportABI = require("../abis/seaport.json");
const x2y2ABI = require("../abis/x2y2.json");
const nftNativeTradingImport = require("../artifacts/contracts/marketplace/NftMarketplace.sol/NftMarketplace.json");
const nftNativeTradingABI = nftNativeTradingImport.abi;
const { ethers } = require("hardhat");
const fetch = require("isomorphic-unfetch");
const axios = require("axios");

const {
  createLooksrareParametersForNFTListing,
  getLooksrareNonce,
  useLooksrareRoyaltyFeeRegistryContractContract,
  getLooksrareAddresses,
  useLooksrareStrategyContract,
  signOrderForLooksrare,
} = require("./utils/aggregator/looksrareHelper");
const {
  libraryCall,
  generateParameters,
  generateOfferArray,
  generateOrderConsiderationArray,
  getLooksrareTotalValue,
  getSeaportTotalValue,
} = require("../test/utils/aggregator/index");
const { createSeaportParametersForNFTListing, signOrderForOpensea } = require("./utils/aggregator/seaportHelper");
const {
  createX2Y2ParametersForNFTListing,
  test2List,
  getNetworkMeta,
  encodeOrder,
  buyOrder,
} = require("./utils/aggregator/xy2yHelper");
const { CROSS_CHAIN_SEAPORT_ADDRESS, OPENSEA_CONDUIT_ADDRESS, MAX_INT } = require("./utils/aggregator/types");
const delay = require("delay");
const {
  ETH_ASSET_CLASS,
  signMarketplaceOrder,
  ERC20_ASSET_CLASS,
  ERC721_ASSET_CLASS,
  convertNftToken,
  convertSmallNftToken,
  AuctionType,
  MAX_UINT,
} = require("./utils/sign-utils");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;
    let MarketplaceRegistry, deployedMarketplaceRegistry;
    let LooksrareLibV1, deployedLooksrareLibV1;
    let SeaportLib1_1, deployedSeaportLib1_1;
    let X2Y2LibV1, deployedX2Y2LibV1;
    let Mock721, deployedMock721;
    let Mock1155, deployedMock1155;
    let Mooncats, deployedMooncats;
    let CryptoPunks, deployedCryptoPunks;
    let PausableZone, deployedPausableZone;
    let deployedXEENUS, deployedNftToken;
    let WETH, deployedWETH;
    let looksrare = new ethers.utils.Interface(looksrareABI);
    let seaport = new ethers.utils.Interface(seaportABI);
    let x2y2 = new ethers.utils.Interface(x2y2ABI);
    let nftNativeTrading = new ethers.utils.Interface(nftNativeTradingABI);
    const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
    const secondSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

    const chainId = hre.network.config.chainId; // 5 = goerli

    const INFURA_KEY = "460ed70fa7394604a709b7dff23f1641";
    const provider = new ethers.providers.InfuraProvider(chainId == "5" ? "goerli" : "homestead", INFURA_KEY);

    const genLooksrareHelper = async (
      tokenID,
      currency = "0x0000000000000000000000000000000000000000", // ETH by default
      addresses,
      inputNonce,
      priceEth,
      contractAddress,
    ) => {
      const looksrareRoyaltyFeeRegistry = useLooksrareRoyaltyFeeRegistryContractContract(chainId, provider);
      const looksrareStrategy = useLooksrareStrategyContract(chainId, provider);

      const offerer = owner.address;
      const duration = hre.ethers.BigNumber.from(3 * 60 * 60 * 24); // 3 days
      const priceBigNumber = hre.ethers.BigNumber.from((priceEth * 10 ** 18).toString());

      // approve
      await deployedMock721.connect(owner).setApprovalForAll(addresses["TRANSFER_MANAGER_ERC721"], true);
      expect(await deployedMock721.ownerOf(tokenID)).to.be.equal(offerer);

      const order = await createLooksrareParametersForNFTListing(
        offerer,
        contractAddress,
        hre.ethers.BigNumber.from(tokenID), // tokenId
        priceBigNumber, // price
        currency,
        chainId,
        hre.ethers.BigNumber.from(inputNonce),
        looksrareStrategy,
        looksrareRoyaltyFeeRegistry,
        duration,
      );

      const { v, r, s } = await signOrderForLooksrare(chainId, ownerSigner, order);

      const {
        nonce,
        tokenId,
        collection,
        strategy,
        signer,
        isOrderAsk,
        amount,
        price,
        startTime,
        endTime,
        minPercentageToAsk,
        params,
      } = order;

      const executorAddress = deployedNftAggregator.address;

      const hexParam = await looksrare.encodeFunctionData("matchAskWithTakerBid", [
        {
          isOrderAsk: false,
          taker: executorAddress,
          price,
          tokenId,
          minPercentageToAsk,
          params: params,
        },
        {
          isOrderAsk,
          signer,
          collection,
          price,
          tokenId,
          amount,
          strategy,
          currency,
          nonce,
          startTime,
          endTime,
          minPercentageToAsk,
          params: params,
          v,
          r,
          s,
        },
      ]);

      const p = [
        {
          isOrderAsk: false,
          taker: executorAddress,
          price,
          tokenId,
          minPercentageToAsk,
          params: params,
        },
        {
          isOrderAsk,
          signer,
          collection,
          price,
          tokenId,
          amount,
          strategy,
          currency,
          nonce,
          startTime,
          endTime,
          minPercentageToAsk,
          params: params,
          v,
          r,
          s,
        },
      ];

      const wholeHex = await looksrareLib.encodeFunctionData("_tradeHelper", [
        currency == "0x0000000000000000000000000000000000000000" ? price : hre.ethers.BigNumber.from(0),
        hexParam,
        collection,
        tokenId,
        true, // failIfRevert,
      ]);

      const genHex = libraryCall("_tradeHelper(uint256,bytes,address,uint256,bool)", wholeHex.slice(10));

      return {
        tradeData: genHex,
        value: currency == "0x0000000000000000000000000000000000000000" ? priceBigNumber : hre.ethers.BigNumber.from(0),
        marketId: "0", // looksrare
      };
    };

    const genSeaportHelper = async (
      tokenId,
      currency = "0x0000000000000000000000000000000000000000", // ETH by default
      priceEth,
    ) => {
      const offerer = owner.address;
      const contractAddress = deployedMock721.address;
      const duration = hre.ethers.BigNumber.from(3 * 60 * 60 * 24); // 3 days
      const startingPrice = hre.ethers.BigNumber.from((priceEth * 10 ** 18).toString());
      const endingPrice = hre.ethers.BigNumber.from((priceEth * 10 ** 18).toString());

      expect(await deployedMock721.ownerOf(tokenId)).to.be.equal(offerer);

      // approve
      await deployedMock721.connect(owner).setApprovalForAll(OPENSEA_CONDUIT_ADDRESS, true);

      const collectionFee = null; // since this is a dummy 721 contract that has no royalties

      const data = createSeaportParametersForNFTListing(
        deployedPausableZone.address,
        offerer,
        contractAddress,
        tokenId,
        startingPrice,
        endingPrice,
        currency,
        duration,
        collectionFee,
        chainId,
      );

      const signature = await signOrderForOpensea(chainId, ownerSigner, provider, data);

      return { signature, data };
    };

    const looksrareLib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InvalidChain","type":"error"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"tradeData","type":"bytes"},{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bool","name":"revertTxFail","type":"bool"}],"name":"_tradeHelper","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]`,
    );
    const seaportLib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InputLengthMiconstsmatch","type":"error"},{"inputs":[],"name":"OPENSEA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"address","name":"offerer","type":"address"},{"internalType":"address","name":"zone","type":"address"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"}],"internalType":"struct OfferItem[]","name":"offer","type":"tuple[]"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"},{"internalType":"address payable","name":"recipient","type":"address"}],"internalType":"struct ConsiderationItem[]","name":"consideration","type":"tuple[]"},{"internalType":"enum OrderType","name":"orderType","type":"uint8"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bytes32","name":"zoneHash","type":"bytes32"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes32","name":"conduitKey","type":"bytes32"},{"internalType":"uint256","name":"totalOriginalConsiderationItems","type":"uint256"}],"internalType":"struct OrderParameters","name":"parameters","type":"tuple"},{"internalType":"uint120","name":"numerator","type":"uint120"},{"internalType":"uint120","name":"denominator","type":"uint120"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"bytes","name":"extraData","type":"bytes"}],"internalType":"struct AdvancedOrder[]","name":"advancedOrders","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"enum Side","name":"side","type":"uint8"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"identifier","type":"uint256"},{"internalType":"bytes32[]","name":"criteriaProof","type":"bytes32[]"}],"internalType":"struct CriteriaResolver[]","name":"criteriaResolvers","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"offerFulfillments","type":"tuple[][]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"considerationFulfillments","type":"tuple[][]"},{"internalType":"bytes32","name":"fulfillerConduitKey","type":"bytes32"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"maximumFulfilled","type":"uint256"}],"internalType":"struct SeaportLib1_1.SeaportBuyOrder[]","name":"openSeaBuys","type":"tuple[]"},{"internalType":"uint256[]","name":"msgValue","type":"uint256[]"},{"internalType":"bool","name":"revertIfTrxFails","type":"bool"}],"name":"fulfillAvailableAdvancedOrders","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
    );
    const x2y2Lib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InvalidChain","type":"error"},{"inputs":[{"components":[{"components":[{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"network","type":"uint256"},{"internalType":"uint256","name":"intent","type":"uint256"},{"internalType":"uint256","name":"delegateType","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"contract IERC20Upgradeable","name":"currency","type":"address"},{"internalType":"bytes","name":"dataMask","type":"bytes"},{"components":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct OrderItem[]","name":"items","type":"tuple[]"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"uint8","name":"signVersion","type":"uint8"}],"internalType":"struct Order[]","name":"orders","type":"tuple[]"},{"components":[{"internalType":"enum Op","name":"op","type":"uint8"},{"internalType":"uint256","name":"orderIdx","type":"uint256"},{"internalType":"uint256","name":"itemIdx","type":"uint256"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bytes32","name":"itemHash","type":"bytes32"},{"internalType":"contract IDelegate","name":"executionDelegate","type":"address"},{"internalType":"bytes","name":"dataReplacement","type":"bytes"},{"internalType":"uint256","name":"bidIncentivePct","type":"uint256"},{"internalType":"uint256","name":"aucMinIncrementPct","type":"uint256"},{"internalType":"uint256","name":"aucIncDurationSecs","type":"uint256"},{"components":[{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"address","name":"to","type":"address"}],"internalType":"struct Fee[]","name":"fees","type":"tuple[]"}],"internalType":"struct SettleDetail[]","name":"details","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountToEth","type":"uint256"},{"internalType":"uint256","name":"amountToWeth","type":"uint256"},{"internalType":"address","name":"user","type":"address"},{"internalType":"bool","name":"canFail","type":"bool"}],"internalType":"struct SettleShared","name":"shared","type":"tuple"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"},{"internalType":"uint8","name":"v","type":"uint8"}],"internalType":"struct RunInput","name":"_input","type":"tuple"},{"internalType":"uint256","name":"_msgValue","type":"uint256"},{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bool","name":"_revertIfTrxFails","type":"bool"}],"name":"_run","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
    );
    const nativeTradingLibrary = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InvalidChain","type":"error"},{"inputs":[{"components":[{"components":[{"internalType":"address","name":"maker","type":"address"},{"components":[{"components":[{"internalType":"bytes4","name":"assetClass","type":"bytes4"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.AssetType","name":"assetType","type":"tuple"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.Asset[]","name":"makeAssets","type":"tuple[]"},{"internalType":"address","name":"taker","type":"address"},{"components":[{"components":[{"internalType":"bytes4","name":"assetClass","type":"bytes4"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.AssetType","name":"assetType","type":"tuple"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.Asset[]","name":"takeAssets","type":"tuple[]"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"end","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"enum LibSignature.AuctionType","name":"auctionType","type":"uint8"}],"internalType":"struct LibSignature.Order","name":"sellOrder","type":"tuple"},{"components":[{"internalType":"address","name":"maker","type":"address"},{"components":[{"components":[{"internalType":"bytes4","name":"assetClass","type":"bytes4"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.AssetType","name":"assetType","type":"tuple"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.Asset[]","name":"makeAssets","type":"tuple[]"},{"internalType":"address","name":"taker","type":"address"},{"components":[{"components":[{"internalType":"bytes4","name":"assetClass","type":"bytes4"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.AssetType","name":"assetType","type":"tuple"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct LibAsset.Asset[]","name":"takeAssets","type":"tuple[]"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"end","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"enum LibSignature.AuctionType","name":"auctionType","type":"uint8"}],"internalType":"struct LibSignature.Order","name":"buyOrder","type":"tuple"},{"internalType":"uint8[2]","name":"v","type":"uint8[2]"},{"internalType":"bytes32[2]","name":"r","type":"bytes32[2]"},{"internalType":"bytes32[2]","name":"s","type":"bytes32[2]"}],"internalType":"struct ExecuteSwapParams","name":"params","type":"tuple"},{"internalType":"uint256","name":"_msgValue","type":"uint256"},{"internalType":"bool","name":"_revertIfTrxFails","type":"bool"}],"name":"_executeSwap","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
    );

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, affiliateUser, ...addrs] = await ethers.getSigners();

      LooksrareLibV1 = await ethers.getContractFactory("LooksrareLibV1");
      Mock721 = await ethers.getContractFactory("Test721");
      deployedMock721 = await Mock721.deploy();
      Mock1155 = await ethers.getContractFactory("TestERC1155");
      deployedMock1155 = await Mock1155.deploy();
      Mooncats = await ethers.getContractFactory("MoonCatRescue");
      deployedMooncats = await Mooncats.deploy();
      PausableZone = await ethers.getContractFactory("PausableZone");
      deployedPausableZone = await PausableZone.deploy();

      CryptoPunks = await ethers.getContractFactory("CryptoPunksMarket");
      deployedCryptoPunks = await CryptoPunks.deploy();
      deployedLooksrareLibV1 = await LooksrareLibV1.deploy();
      SeaportLib1_1 = await ethers.getContractFactory("SeaportLib1_1");
      deployedSeaportLib1_1 = await SeaportLib1_1.deploy();
      X2Y2LibV1 = await ethers.getContractFactory("X2Y2LibV1");
      deployedX2Y2LibV1 = await X2Y2LibV1.deploy();
      NativeNftTradingLib = await ethers.getContractFactory("NativeNftTradingLib");
      deployedNativeNftTradingLib = await NativeNftTradingLib.deploy();

      deployedNftToken = await (await ethers.getContractFactory("NftToken")).deploy();
      deployedXEENUS = await (await ethers.getContractFactory("NftToken")).deploy();
      TESTNET_XEENUS = deployedXEENUS.address;

      MarketplaceRegistry = await ethers.getContractFactory("MarketplaceRegistry");
      deployedMarketplaceRegistry = await upgrades.deployProxy(MarketplaceRegistry, [], {
        kind: "uups",
      });

      await deployedMarketplaceRegistry.addMarketplace(deployedLooksrareLibV1.address, true);
      await deployedMarketplaceRegistry.addMarketplace(deployedSeaportLib1_1.address, true);
      await deployedMarketplaceRegistry.addMarketplace(deployedX2Y2LibV1.address, true);
      await deployedMarketplaceRegistry.addMarketplace(deployedNativeNftTradingLib.address, true);

      expect((await deployedMarketplaceRegistry.marketplaces(0)).proxy).to.be.equal(deployedLooksrareLibV1.address);
      expect((await deployedMarketplaceRegistry.marketplaces(1)).proxy).to.be.equal(deployedSeaportLib1_1.address);
      expect((await deployedMarketplaceRegistry.marketplaces(2)).proxy).to.be.equal(deployedX2Y2LibV1.address);
      expect((await deployedMarketplaceRegistry.marketplaces(3)).proxy).to.be.equal(
        deployedNativeNftTradingLib.address,
      );

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(
        NftAggregator,
        [deployedMarketplaceRegistry.address, deployedCryptoPunks.address, deployedMooncats.address],
        {
          kind: "uups",
          unsafeAllow: ["delegatecall"],
        },
      );

      const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
      const GOERLI_NFT_MARKETPLACE = "0xa75F995f252ba5F7C17f834b314201271d32eC35"; // tits
      deployedNftMarketplace = NftMarketplace.attach(GOERLI_NFT_MARKETPLACE);
    });

    describe("NFT Aggregation", async function () {
      it("should confirm mock721 balances", async function () {
        await deployedMock721.connect(owner).mint("1");
        await deployedMock721.connect(owner).mint("2");
        await deployedMock721.connect(owner).mint("3");

        expect(await deployedMock721.balanceOf(owner.address)).to.be.equal(3);
        expect(await deployedMock721.ownerOf("1")).to.be.equal(owner.address);
        expect(await deployedMock721.ownerOf("2")).to.be.equal(owner.address);
        expect(await deployedMock721.ownerOf("3")).to.be.equal(owner.address);

        expect(await deployedMock721.balanceOf(second.address)).to.be.equal(0);
      });

      it("should allow marketplace registry edits", async function () {
        expect(await deployedMarketplaceRegistry.owner()).to.be.equal(owner.address);
        await deployedMarketplaceRegistry.setOwner(second.address);
        expect(await deployedMarketplaceRegistry.owner()).to.be.equal(second.address);
        await expect(deployedMarketplaceRegistry.setOwner(second.address)).to.be.reverted; // owner is wrong

        await deployedMarketplaceRegistry.connect(second).setOwner(owner.address);
        expect(await deployedMarketplaceRegistry.owner()).to.be.equal(owner.address);
      });

      it("should allow nft aggregation parameter creation on looksrare", async function () {
        let hex = await looksrare.encodeFunctionData("matchAskWithTakerBid", [
          {
            isOrderAsk: false,
            taker: "0x59495589849423692778a8c5aaCA62CA80f875a4",
            price: "25000000000000000",
            tokenId: 1,
            minPercentageToAsk: 7500,
            params: "0x",
          },
          {
            isOrderAsk: true,
            signer: "0x6245Cc08E29ca462f9bae9B18fD31e2a83927705",
            collection: "0x33AcFb7d8eF4FBEeb4d837c7E90B8F74E219DAf7",
            price: "25000000000000000",
            tokenId: 1,
            amount: 1,
            strategy: "0x732319A3590E4fA838C111826f9584a9A2fDEa1a",
            currency: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
            nonce: 0,
            startTime: 1657491493,
            endTime: 1673047035,
            minPercentageToAsk: 7500,
            params: "0x",
            v: 28,
            r: "0xe19a51cc67d9b99cdb06562a2f42d4d8589bf950996b6a1b2fab6d6cf469c076",
            s: "0x7e6d98660f43cf7ba183e447c62d63a0bfcf7b267b23ed128279a6b2aa86758c",
          },
        ]);

        const hexGen = `0x38e2920900000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000059495589849423692778a8c5aaca62ca80f875a40000000000000000000000000000000000000000000000000058d15e1762800000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000001d4c00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000006245cc08e29ca462f9bae9b18fd31e2a8392770500000000000000000000000033acfb7d8ef4fbeeb4d837c7e90b8f74e219daf70000000000000000000000000000000000000000000000000058d15e1762800000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000732319a3590e4fa838c111826f9584a9a2fdea1a000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000062cb50250000000000000000000000000000000000000000000000000000000063b8abfb0000000000000000000000000000000000000000000000000000000000001d4c0000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001ce19a51cc67d9b99cdb06562a2f42d4d8589bf950996b6a1b2fab6d6cf469c0767e6d98660f43cf7ba183e447c62d63a0bfcf7b267b23ed128279a6b2aa86758c0000000000000000000000000000000000000000000000000000000000000000`;
        expect(hex).to.be.equal(hexGen);
      });

      it("should generate seaport fulfillAvailableAdvancedOrder hex data successfully", async function () {
        const inputData = [
          [
            {
              denominator: "1",
              numerator: "1",
              parameters: {
                conduitKey: "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000",
                consideration: [
                  {
                    itemType: 0,
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "15575000000000000",
                    endAmount: "15575000000000000",
                    recipient: "0x59495589849423692778a8c5aaCA62CA80f875a4",
                  },
                  {
                    itemType: 0,
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "445000000000000",
                    endAmount: "445000000000000",
                    recipient: "0x8De9C5A032463C561423387a9648c5C7BCC5BC90",
                  },
                  {
                    itemType: 0,
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "1780000000000000",
                    endAmount: "1780000000000000",
                    recipient: "0x8E202708a7abe4F4ACe1bF00115faEf0c55101d5",
                  },
                ],
                endTime: "1661204483",
                offer: [
                  {
                    itemType: 2,
                    token: "0x2D5D5E4efbD13c2347013d4C9F3c5c666f18D55c",
                    identifierOrCriteria: "2",
                    startAmount: "1",
                    endAmount: "1",
                  },
                ],
                offerer: "0x59495589849423692778a8c5aaca62ca80f875a4",
                orderType: 2,
                salt: "52230688045690710",
                startTime: "1658526083",
                totalOriginalConsiderationItems: 3,
                zone: "0x00000000e88fe2628ebc5da81d2b3cead633e89e",
                zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
              },
              signature:
                "0x214739495d94919b94f3bdfc01ddd9adbcb4ce8f1448d9d761885a3785d481dd2fcf0019a8b9fb7088f66dd3061147f6c4c9d5873250ece5f19c14d53f18ed721c",
              extraData: "0x",
            },
          ],
          [],
          [[{ orderIndex: 0, itemIndex: 0 }]],
          [
            [{ orderIndex: "0", itemIndex: "0" }],
            [{ orderIndex: "0", itemIndex: "1" }],
            [{ orderIndex: "0", itemIndex: "2" }],
          ],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x338eFdd45AE7D010da108f39d293565449C52682",
          "1",
        ];

        const genHex = await seaport.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);
        const hex = `0x87201b4100000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000006e0000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000000000007a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000338efdd45ae7d010da108f39d293565449c5268200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000000000000000000000000000000000005a000000000000000000000000059495589849423692778a8c5aaca62ca80f875a400000000000000000000000000000000e88fe2628ebc5da81d2b3cead633e89e0000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000062db1983000000000000000000000000000000000000000000000000000000006303f803000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b98f88b7566f560000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000002d5d5e4efbd13c2347013d4c9f3c5c666f18d55c00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037556146607000000000000000000000000000000000000000000000000000003755614660700000000000000000000000000059495589849423692778a8c5aaca62ca80f875a4000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000194b9a2ecd000000000000000000000000000000000000000000000000000000194b9a2ecd0000000000000000000000000008de9c5a032463c561423387a9648c5c7bcc5bc90000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000652e68bb34000000000000000000000000000000000000000000000000000000652e68bb340000000000000000000000000008e202708a7abe4f4ace1bf00115faef0c55101d50000000000000000000000000000000000000000000000000000000000000041214739495d94919b94f3bdfc01ddd9adbcb4ce8f1448d9d761885a3785d481dd2fcf0019a8b9fb7088f66dd3061147f6c4c9d5873250ece5f19c14d53f18ed721c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002`;
        expect(hex).to.be.equal(genHex);
      });

      it("should allow user to user to list on looksrare and other user to purchase it", async function () {
        const looksrareRoyaltyFeeRegistry = useLooksrareRoyaltyFeeRegistryContractContract(chainId, provider);
        const looksrareStrategy = useLooksrareStrategyContract(chainId, provider);
        const addresses = await getLooksrareAddresses(chainId);
        const contractAddress = deployedMock721.address;

        await deployedMock721.connect(owner).mint("1");
        await deployedMock721.connect(owner).mint("2");
        await deployedMock721.connect(owner).mint("3");

        const offerer = owner.address;
        const tokenID = "1";
        const currency = addresses["WETH"];
        const duration = hre.ethers.BigNumber.from(60 * 60 * 72); // 3 days
        const inputNonce = await getLooksrareNonce(offerer, chainId);

        // approve
        await deployedMock721.connect(owner).setApprovalForAll(addresses["TRANSFER_MANAGER_ERC721"], true);

        const order = await createLooksrareParametersForNFTListing(
          offerer,
          contractAddress,
          hre.ethers.BigNumber.from(tokenID), // tokenId
          hre.ethers.BigNumber.from("12000000000000000"), // price
          currency,
          chainId,
          inputNonce,
          looksrareStrategy,
          looksrareRoyaltyFeeRegistry,
          duration,
        );

        const { v, r, s } = await signOrderForLooksrare(chainId, ownerSigner, order);

        const {
          nonce,
          tokenId,
          collection,
          strategy,
          signer,
          isOrderAsk,
          amount,
          price,
          startTime,
          endTime,
          minPercentageToAsk,
          params,
        } = order;

        // local deployed nft aggregator
        const executorAddress = deployedNftAggregator.address;

        const hexParam = await looksrare.encodeFunctionData("matchAskWithTakerBidUsingETHAndWETH", [
          {
            isOrderAsk: false,
            taker: executorAddress,
            price,
            tokenId,
            minPercentageToAsk,
            params: params,
          },
          {
            isOrderAsk,
            signer,
            collection,
            price,
            tokenId,
            amount,
            strategy,
            currency,
            nonce,
            startTime,
            endTime,
            minPercentageToAsk,
            params: params,
            v,
            r,
            s,
          },
        ]);

        const wholeHex = await looksrareLib.encodeFunctionData("_tradeHelper", [
          price,
          hexParam,
          collection,
          tokenId,
          true, // failIfRevert,
        ]);

        const genHex = libraryCall("_tradeHelper(uint256,bytes,address,uint256,bool)", wholeHex.slice(10));

        const totalValue = hre.ethers.BigNumber.from(price);

        const marketId = 0; // looksrare
        const value = totalValue; // wei sent
        try {
          await deployedNftAggregator
            .connect(second)
            .batchTradeWithETH([{ marketId, value, tradeData: genHex }], [[], [], [0, 0]], { value: totalValue });
        } catch (err) {
          console.log("error while batch trading: ", err);
        }

        expect(await deployedMock721.ownerOf(tokenID)).to.be.equal(second.address);
      });

      it("should create x2y2 generated hexes for arbitrary x2y2 orders", async function () {
        // we must use deployed goerli test NFT bc x2y2 checks for existence and approval using the actual goerli network
        const GOERLI_NFT = "0x554CC509C75D8627090421A7dc0E1FfA6DCBB1Eb";
        const createOrder = false;
        const network = "goerli";
        const Test721 = await hre.ethers.getContractFactory("Test721_2");
        const deployed721 = Test721.attach(GOERLI_NFT);

        const contractAddress = deployed721.address;
        const tokenId = "1"; // 0 - 9

        try {
          const headers = {
            headers: {
              "X-API-KEY": process.env.X2Y2_GOERLI_API_KEY,
            },
          };

          // Due to nature of X2Y2 signing, they check for goerli approvals and existence of NFT. We can't automate a forked goerli NFT here.
          // As a result, we are now creating multiple persistent listings that can be used for testing purposes. These listings have 10 years expiration
          // and have a buy now value of 0.64 ETH on goerli, making it unlikely for someone to buy given NFT.
          // @dev team: set createOrder = true if you have actually have 0x554CC509C75D8627090421A7dc0E1FfA6DCBB1Eb NFT minted to your wallet
          // if so, you can approve and create the order correct without x2y2's API failing.
          if (createOrder) {
            const expirationTime = hre.ethers.BigNumber.from(Date.now())
              .div(1000)
              .add(hre.ethers.BigNumber.from(60 * 60 * 24 * 3650))
              .toString(); // 10 years
            const price = hre.ethers.BigNumber.from((0.64 * 10 ** 18).toString()); // 0.64 ETH to deter people buying it

            // approve
            await deployed721.connect(owner).setApprovalForAll(getNetworkMeta(network)?.erc721DelegateContract, true);

            // API call listing (bc X2Y2 needs an approved signer)
            const order = await createX2Y2ParametersForNFTListing(
              network,
              ownerSigner,
              contractAddress,
              tokenId,
              "erc721",
              price,
              expirationTime,
            );

            const data = {
              order: encodeOrder(order),
              isBundle: false,
              bundleName: "",
              bundleDesc: "",
              orderIds: [],
              royalties: [],
              changePrice: false,
              isCollection: false, // for sell orders
              isPrivate: false,
              taker: null,
            };

            await axios.post(`${getNetworkMeta(network)?.apiBaseURL}/api/orders/add`, data, headers);
            // give x2y2 time to propagate order
            await delay(2000);
          }

          const orders = await fetch(
            `${getNetworkMeta(network)?.apiBaseURL}/v1/orders?maker=${
              ownerSigner.address
            }&contract=${contractAddress}&token_id=${tokenId}`,
            headers,
          );
          const submittedOrders = await orders.json();

          const runInput = await buyOrder(
            network,
            deployedNftAggregator.address,
            submittedOrders?.data?.[0],
            {},
            JSON.stringify(headers),
          );

          const totalValue =
            submittedOrders?.data?.[0]?.currency == "0x0000000000000000000000000000000000000000"
              ? submittedOrders?.data?.[0]?.price
              : "0";

          const failIfRevert = true;

          const inputData = [runInput, totalValue, contractAddress, tokenId, failIfRevert];
          const wholeHex = await x2y2Lib.encodeFunctionData("_run", inputData);

          const genHex = libraryCall("_run(RunInput,uint256,address,uint256,bool)", wholeHex.slice(10));

          const setData = {
            tradeData: genHex,
            value: totalValue,
            marketId: "2", // x2y2
          };

          const combinedOrders = [setData];

          await deployedNftAggregator
            .connect(second)
            .batchTradeWithETH(combinedOrders, [[], [], [0, 0]], { value: totalValue });

          expect(await deployed721.ownerOf(tokenId)).to.be.equal(second.address);
        } catch (err) {
          console.log("error with submitting x2y2 order: ", err);
        }
      });

      it("should create opensea generated hexes for arbitrary seaport orders", async function () {
        await deployedMock721.connect(owner).mint("1");

        const offerer = owner.address;
        const contractAddress = deployedMock721.address;
        const tokenId = "1";
        const duration = hre.ethers.BigNumber.from(60 * 60 * 72); // 3 days
        const recipient = second.address;
        const currency = "0x0000000000000000000000000000000000000000"; // ETH
        const startingPrice = hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString());
        const endingPrice = hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString());

        expect(await deployedMock721.ownerOf(tokenId)).to.be.equal(owner.address);

        // approve
        await deployedMock721.connect(owner).setApprovalForAll(OPENSEA_CONDUIT_ADDRESS, true);

        const collectionFee = null; // since this is a dummy 721 contract that has no royalties

        const data = createSeaportParametersForNFTListing(
          deployedPausableZone.address,
          offerer,
          contractAddress,
          tokenId,
          startingPrice,
          endingPrice,
          currency,
          duration,
          collectionFee,
          chainId,
        );

        const signature = await signOrderForOpensea(chainId, ownerSigner, provider, data);

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            [
              {
                denominator: "1",
                numerator: "1",
                parameters: {
                  conduitKey: data.conduitKey,
                  consideration: data.consideration,
                  endTime: data.endTime,
                  offer: data.offer,
                  offerer: data.offerer, // seller
                  orderType: data.orderType,
                  salt: data.salt,
                  startTime: data.startTime,
                  totalOriginalConsiderationItems: Number(data.totalOriginalConsiderationItems),
                  zone: data.zone, // opensea pausable zone
                  zoneHash: data.zoneHash,
                },
                signature: signature,
                extraData: [],
              },
            ],
            [],
            generateOfferArray([data.offer]),
            generateOrderConsiderationArray([data.consideration]),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            "1",
          ],
        ];

        const totalValue = startingPrice;
        const failIfRevert = true;

        const inputData = [orderStruct, [startingPrice], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: startingPrice,
          marketId: "1",
        };

        const combinedOrders = [setData];

        await deployedNftAggregator
          .connect(second)
          .batchTradeWithETH(combinedOrders, [[], [], [0, 0]], { value: totalValue });

        expect(await deployedMock721.ownerOf(tokenId)).to.be.equal(second.address);
      });

      it("should allow atomic nft purchases on the native NFT.com marketplace", async function () {
        try {
          await deployedNftMarketplace.modifyWhitelist(deployedNftToken.address, true);
          await deployedNftMarketplace.modifyWhitelist(TESTNET_XEENUS, true);
          await deployedNftMarketplace.editAggregator(deployedNftAggregator.address, true);
          await owner.sendTransaction({ to: second.address, value: convertNftToken(2) });

          const tokenIds = ["1", "2", "3"];

          for (let i = 0; i < tokenIds.length; i++) {
            await deployedMock721.connect(owner).mint(tokenIds[i]);
          }

          const failIfRevert = true;

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
                [deployedMock721.address, 1, true], // values
                [1, 0], // data to be encoded
              ],
            ],
            ethers.constants.AddressZero,
            [
              [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(100), convertNftToken(10)]],
              [ERC20_ASSET_CLASS, ["address"], [TESTNET_XEENUS], [convertNftToken(500), convertNftToken(50)]],
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

          const {
            v: v1,
            r: r1,
            s: s1,
            order: buyOrder,
          } = await signMarketplaceOrder(
            secondSigner,
            [
              [ERC20_ASSET_CLASS, ["address"], [deployedNftToken.address], [convertNftToken(500), 0]],
              [ERC20_ASSET_CLASS, ["address"], [TESTNET_XEENUS], [convertNftToken(250), 0]],
              [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertSmallNftToken(1), 0]],
            ],
            owner.address,
            [[ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [deployedMock721.address, 1, true], [1, 0]]],
            0,
            0,
            await deployedNftMarketplace.nonces(owner.address),
            ethers.provider,
            deployedNftMarketplace.address,
            AuctionType.English,
          );

          expect((await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1))[0]).to.be.true;

          // add approvals
          const NFT_PROXY_GOERLI = "0x73994Fc4aC9EAb8e8E1c29E5C9d27A761D9Ab1eF"; // NFT proxy
          const ERC20_PROXY_GOERLI = "0xCD979ec33B43eCE6523B41BA5c9e409568eDFB97"; // ERC20 proxy

          await deployedNftToken.connect(second).approve(ERC20_PROXY_GOERLI, MAX_UINT);
          await deployedXEENUS.connect(second).approve(ERC20_PROXY_GOERLI, MAX_UINT);
          await deployedMock721.connect(owner).approve(NFT_PROXY_GOERLI, 1);
          await deployedMock721.connect(owner).approve(NFT_PROXY_GOERLI, 2);

          // transfer tokens
          await deployedXEENUS.connect(owner).transfer(second.address, convertNftToken(500));
          await deployedNftToken.connect(owner).transfer(second.address, convertNftToken(1000));

          const totalValue = convertSmallNftToken(1);

          const inputData = [[sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]], totalValue, failIfRevert];
          const wholeHex = await nativeTradingLibrary.encodeFunctionData("_executeSwap", inputData);

          const genHex = libraryCall("_executeSwap(ExecuteSwapParams,uint256,bool)", wholeHex.slice(10));

          const setData = {
            tradeData: genHex,
            value: totalValue,
            marketId: "3", // native nft.com exchange
          };

          const combinedOrders = [setData];

          await deployedNftAggregator
            .connect(second)
            .batchTradeWithETH(combinedOrders, [[], [], [0, 0]], { value: totalValue });

          expect(await deployedMock721.ownerOf(1)).to.be.equal(second.address);
        } catch (err) {
          console.log("error with submitting native nft.com order: ", err);
        }
      });

      it("should allow two nft purchases in one and throw errors on edge cases", async function () {
        const tokenIds = ["1", "2", "3"];
        const recipient = second.address;

        for (let i = 0; i < tokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(tokenIds[i]);
        }

        const results = await Promise.all(
          tokenIds.map((id) => genSeaportHelper(id, "0x0000000000000000000000000000000000000000", "0.012")),
        );

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            generateParameters(results, 1),
            [],
            generateOfferArray(results.map((i) => i.data.offer)),
            generateOrderConsiderationArray(results.map((i) => i.data.consideration)),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            results.length,
          ],
        ];

        const totalValue = getSeaportTotalValue(results);

        const failIfRevert = true;

        const inputData = [orderStruct, [totalValue], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: totalValue,
          marketId: "1",
        };

        const combinedOrders = [setData];

        expect((await deployedMarketplaceRegistry.marketplaces(1))?.isActive).to.be.equal(true);
        await deployedMarketplaceRegistry.setMarketplaceStatus("1", false);
        expect((await deployedMarketplaceRegistry.marketplaces(1))?.isActive).to.be.equal(false);

        // reverts due to marketplace not being active
        await expect(
          deployedNftAggregator
            .connect(second)
            .batchTradeWithETH(combinedOrders, [[], [], [0, 0]], { value: totalValue }),
        ).to.be.reverted;

        // due to no marketId being active
        await expect(
          deployedMarketplaceRegistry.connect(owner).setMarketplaceProxy("10", deployedLooksrareLibV1.address, false),
        ).to.be.reverted;

        // swap marketIds
        await deployedMarketplaceRegistry.setMarketplaceProxy("0", deployedSeaportLib1_1.address, true);
        await deployedMarketplaceRegistry.setMarketplaceProxy("1", deployedLooksrareLibV1.address, true);

        await deployedMarketplaceRegistry.setMarketplaceStatus("1", true);
        expect((await deployedMarketplaceRegistry.marketplaces(1))?.isActive).to.be.equal(true);

        // use new setData since marketIds are swapped
        const setData2 = {
          tradeData: genHex,
          value: totalValue,
          marketId: "0",
        };

        const combinedOrders2 = [setData2];

        await deployedNftAggregator
          .connect(owner)
          .batchTradeWithETH(combinedOrders2, [[], [], [0, 0]], { value: totalValue });

        for (let i = 0; i < tokenIds.length; i++) {
          expect(await deployedMock721.ownerOf(tokenIds[i])).to.be.equal(second.address);
        }
      });

      it("should allow batched looksrare and seaport purchases with both ETH and WETH transfer", async function () {
        const seaportTokenIds = ["1", "2"];
        const looksrareTokenIds = ["3", "4"];
        const recipient = second.address;
        const offerer = owner.address;

        for (let i = 0; i < seaportTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
        }

        for (let i = 0; i < looksrareTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
        }

        // ====================================================================================================
        const addresses = await getLooksrareAddresses(chainId);
        const nonce = await getLooksrareNonce(offerer, chainId);
        const Test20 = await hre.ethers.getContractFactory("Test20");
        const deployedTest20 = await Test20.connect(second).deploy();

        expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
          hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
        );

        const looksrareResults = await Promise.all(
          looksrareTokenIds.map((id, index) =>
            genLooksrareHelper(
              id,
              addresses["WETH"],
              addresses,
              Number(nonce) + Number(index) + 1,
              "0.001",
              deployedMock721.address,
            ),
          ),
        );

        const TestWETH = await hre.ethers.getContractFactory("WETH");
        const deployedWETH = await TestWETH.attach(addresses["WETH"]);
        const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
        const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

        expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

        // approve
        await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
        await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);

        expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

        // one time approval for ERC20s
        await deployedNftAggregator.setOneTimeApproval([
          {
            token: addresses["WETH"],
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: addresses["WETH"],
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
        ]);

        expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );

        // ====================================================================================================

        const seaportResults = await Promise.all(
          seaportTokenIds.map((id, index) =>
            genSeaportHelper(
              id,
              index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
              index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
            ),
          ),
        );

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            generateParameters(seaportResults, 1),
            [],
            generateOfferArray(seaportResults.map((i) => i.data.offer)),
            generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            seaportResults.length,
          ],
        ];

        const seaportTotalValue = getSeaportTotalValue(seaportResults);

        const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

        const failIfRevert = true;

        const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: seaportTotalValue,
          marketId: "1",
        };

        const combinedOrders = [setData].concat(looksrareResults);
        const totalValue = seaportTotalValue.add(looksrareTotalValue);

        await deployedNftAggregator.connect(second).batchTrade(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length).mul(hre.ethers.BigNumber.from(10).pow(15)),
            ],
          ],
          combinedOrders,
          [[], [], [0, 0]],
          { value: totalValue },
        );
        // erc20 details, tradeDetails, tradeInfo => [conversionDetails, dust details, feeDetails]

        for (let i = 0; i < seaportTokenIds.length; i++) {
          expect(await deployedMock721.ownerOf(seaportTokenIds[i])).to.be.equal(second.address);
        }

        for (let i = 0; i < looksrareTokenIds.length; i++) {
          expect(await deployedMock721.ownerOf(looksrareTokenIds[i])).to.be.equal(second.address);
          expect(wethBalanceAfter.sub(await deployedWETH.balanceOf(second.address))).to.be.equal(
            hre.ethers.BigNumber.from(looksrareTokenIds.length).mul(hre.ethers.BigNumber.from(10).pow(15)),
          );
        }
      });

      it("should handle edge cases for weth + eth purchases on looksrare and seaport", async function () {
        const seaportTokenIds = ["1", "2"];
        const looksrareTokenIds = ["3", "4"];
        const recipient = second.address;
        const offerer = owner.address;

        for (let i = 0; i < seaportTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
        }

        for (let i = 0; i < looksrareTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
        }

        // ====================================================================================================
        const addresses = await getLooksrareAddresses(chainId);
        const nonce = await getLooksrareNonce(offerer, chainId);
        const Test20 = await hre.ethers.getContractFactory("Test20");
        const deployedTest20 = await Test20.connect(second).deploy();

        expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
          hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
        );

        const looksrareResults = await Promise.all(
          looksrareTokenIds.map((id, index) =>
            genLooksrareHelper(
              id,
              addresses["WETH"],
              addresses,
              Number(nonce) + Number(index) + 3,
              "0.001",
              deployedMock721.address,
            ),
          ),
        );

        const TestWETH = await hre.ethers.getContractFactory("WETH");
        const deployedWETH = await TestWETH.attach(addresses["WETH"]);
        const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
        const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

        expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

        // approve
        await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
        await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);

        expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

        // one time approval for ERC20s
        await deployedNftAggregator.setOneTimeApproval([
          {
            token: addresses["WETH"],
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: addresses["WETH"],
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
        ]);

        expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );

        // ====================================================================================================

        const seaportResults = await Promise.all(
          seaportTokenIds.map((id, index) =>
            genSeaportHelper(
              id,
              index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
              index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
            ),
          ),
        );

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            generateParameters(seaportResults, 1),
            [],
            generateOfferArray(seaportResults.map((i) => i.data.offer)),
            generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            seaportResults.length,
          ],
        ];

        const seaportTotalValue = getSeaportTotalValue(seaportResults);

        const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

        const failIfRevert = true;

        const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: seaportTotalValue,
          marketId: "1",
        };

        const combinedOrders = [setData].concat(looksrareResults);
        const totalValue = 0;

        // reverts due to insufficient value being passed through (seaport fails first)
        await expect(
          deployedNftAggregator.connect(second).batchTrade(
            [
              [deployedTest20.address, addresses["WETH"]],
              [
                hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                  hre.ethers.BigNumber.from(10).pow(15),
                ), // testERC20 only for seaport
                hre.ethers.BigNumber.from(looksrareTokenIds.length).mul(hre.ethers.BigNumber.from(10).pow(15)),
              ],
            ],
            combinedOrders,
            [[], [], [0, 0]],
            { value: totalValue },
          ),
        ).to.be.reverted;

        // reverts due to insufficient value being passed through (looksrare fails first)
        await expect(
          deployedNftAggregator.connect(second).batchTrade(
            [
              [deployedTest20.address, addresses["WETH"]],
              [
                hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                  hre.ethers.BigNumber.from(10).pow(15),
                ), // testERC20 only for seaport
                hre.ethers.BigNumber.from(looksrareTokenIds.length).mul(hre.ethers.BigNumber.from(10).pow(15)),
              ],
            ],
            looksrareResults.concat([setData]),
            [[], [], [0, 0]],
            { value: totalValue },
          ),
        ).to.be.reverted;

        // different error (mistmatch seaport)
        const inputData2 = [orderStruct, [seaportTotalValue, 1], failIfRevert]; // fails mismatch arrays
        const wholeHex2 = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData2);

        const genHex2 = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex2.slice(10),
        );

        const setData2 = {
          tradeData: genHex2,
          value: seaportTotalValue,
          marketId: "1",
        };

        const incorrectOrderLayoutSeaport = [setData2].concat(looksrareResults);
        const correctTotalValue = seaportTotalValue.add(looksrareTotalValue);

        // reverts due to setData2 having mismatch in array length
        await expect(
          deployedNftAggregator.connect(second).batchTrade(
            [
              [deployedTest20.address, addresses["WETH"]],
              [
                hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                  hre.ethers.BigNumber.from(10).pow(15),
                ), // testERC20 only for seaport
                hre.ethers.BigNumber.from(looksrareTokenIds.length).mul(hre.ethers.BigNumber.from(10).pow(15)),
              ],
            ],
            incorrectOrderLayoutSeaport,
            [[], [], [0, 0]],
            { value: correctTotalValue },
          ),
        ).to.be.reverted;

        // successful call, but without dust call
        await deployedNftAggregator.connect(second).batchTrade(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
            ],
          ],
          combinedOrders,
          [[], [], [0, 0]],
          { value: correctTotalValue },
        );

        expect(await deployedWETH.balanceOf(deployedNftAggregator.address)).to.be.equal(
          hre.ethers.BigNumber.from(10).pow(15),
        );
      });

      it("should allow dust calls on trading", async function () {
        const seaportTokenIds = ["1", "2"];
        const looksrareTokenIds = ["3", "4"];
        const recipient = second.address;
        const offerer = owner.address;

        for (let i = 0; i < seaportTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
        }

        for (let i = 0; i < looksrareTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
        }

        // ====================================================================================================
        const addresses = await getLooksrareAddresses(chainId);
        const nonce = await getLooksrareNonce(offerer, chainId);
        const Test20 = await hre.ethers.getContractFactory("Test20");
        const deployedTest20 = await Test20.connect(second).deploy();

        expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
          hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
        );

        const looksrareResults = await Promise.all(
          looksrareTokenIds.map((id, index) =>
            genLooksrareHelper(
              id,
              addresses["WETH"],
              addresses,
              Number(nonce) + Number(index) + 5,
              "0.001",
              deployedMock721.address,
            ),
          ),
        );

        const TestWETH = await hre.ethers.getContractFactory("WETH");
        const deployedWETH = await TestWETH.attach(addresses["WETH"]);
        const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
        const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

        expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

        // approve
        await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
        await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);

        expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

        // one time approval for ERC20s
        await deployedNftAggregator.setOneTimeApproval([
          {
            token: addresses["WETH"],
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: addresses["WETH"],
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
        ]);

        expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );

        // ====================================================================================================

        const seaportResults = await Promise.all(
          seaportTokenIds.map((id, index) =>
            genSeaportHelper(
              id,
              index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
              index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
            ),
          ),
        );

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            generateParameters(seaportResults, 1),
            [],
            generateOfferArray(seaportResults.map((i) => i.data.offer)),
            generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            seaportResults.length,
          ],
        ];

        const seaportTotalValue = getSeaportTotalValue(seaportResults);

        const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

        const failIfRevert = true;

        const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: seaportTotalValue,
          marketId: "1",
        };

        const combinedOrders = [setData].concat(looksrareResults);
        const beforeEthBalance = await ethers.provider.getBalance(second.address);

        // add an extra 1 ETH
        const totalValue = seaportTotalValue.add(looksrareTotalValue).add(hre.ethers.BigNumber.from(10).pow(18));

        // successful call, but with dust call
        await deployedNftAggregator.connect(second).batchTrade(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
            ],
          ],
          combinedOrders,
          [[], [addresses["WETH"]], [0, 0]],
          { value: totalValue },
        );

        // 0 balance of WETH
        expect(await deployedWETH.balanceOf(deployedNftAggregator.address)).to.be.equal(0);

        const afterEthBalance = await ethers.provider.getBalance(second.address);
        expect(beforeEthBalance.sub(afterEthBalance)).to.be.gt(seaportTotalValue.add(looksrareTotalValue)); // gas fees
        expect(beforeEthBalance.sub(afterEthBalance)).to.be.lt(
          totalValue.sub(seaportTotalValue.add(looksrareTotalValue)),
        );
      });

      it("should allow multi asset swaps", async function () {
        const recipient = second.address;
        const offerer = owner.address;

        const seaportTokenIds = ["1", "2"];
        const looksrareTokenIds = ["3", "4"];
        const erc1155 = [
          {
            to: recipient,
            id: "1",
            amount: 100,
            data: "",
          },
          {
            to: recipient,
            id: "2",
            amount: 200,
            data: "",
          },
        ];

        for (let i = 0; i < seaportTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
        }

        for (let i = 0; i < looksrareTokenIds.length; i++) {
          await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
        }

        for (let i = 0; i < erc1155.length; i++) {
          await deployedMock1155.connect(owner).mint(erc1155[i].to, erc1155[i].id, erc1155[i].amount, erc1155[i].data);
        }

        expect(await deployedMock1155.balanceOf(recipient, "1")).to.be.equal(100);
        expect(await deployedMock1155.balanceOf(recipient, "2")).to.be.equal(200);

        // ====================================================================================================
        const addresses = await getLooksrareAddresses(chainId);
        const nonce = await getLooksrareNonce(offerer, chainId);
        const Test20 = await hre.ethers.getContractFactory("Test20");
        const deployedTest20 = await Test20.connect(second).deploy();

        expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
          hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
        );

        const looksrareResults = await Promise.all(
          looksrareTokenIds.map((id, index) =>
            genLooksrareHelper(
              id,
              addresses["WETH"],
              addresses,
              Number(nonce) + Number(index) + 7,
              "0.001",
              deployedMock721.address,
            ),
          ),
        );

        const TestWETH = await hre.ethers.getContractFactory("WETH");
        const deployedWETH = await TestWETH.attach(addresses["WETH"]);
        const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
        const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

        expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

        // approve
        await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
        await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
        await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
        await deployedMock1155.connect(second).setApprovalForAll(deployedNftAggregator.address, true);

        expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
        expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

        // one time approval for ERC20s
        await deployedNftAggregator.setOneTimeApproval([
          {
            token: addresses["WETH"],
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: addresses["EXCHANGE"],
            amount: MAX_INT,
          },
          {
            token: addresses["WETH"],
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
          {
            token: deployedTest20.address,
            operator: CROSS_CHAIN_SEAPORT_ADDRESS,
            amount: MAX_INT,
          },
        ]);

        expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
        expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );
        expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
          MAX_INT,
        );

        // ====================================================================================================

        const seaportResults = await Promise.all(
          seaportTokenIds.map((id, index) =>
            genSeaportHelper(
              id,
              index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
              index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
            ),
          ),
        );

        // orderStruct for SeaportLibV1_1
        const orderStruct = [
          [
            generateParameters(seaportResults, 1),
            [],
            generateOfferArray(seaportResults.map((i) => i.data.offer)),
            generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            seaportResults.length,
          ],
        ];

        const seaportTotalValue = getSeaportTotalValue(seaportResults);

        const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

        const failIfRevert = true;

        const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: seaportTotalValue,
          marketId: "1",
        };

        const combinedOrders = [setData].concat(looksrareResults);
        const beforeEthBalance = await ethers.provider.getBalance(second.address);

        // add an extra 1 ETH
        const totalValue = seaportTotalValue.add(looksrareTotalValue).add(hre.ethers.BigNumber.from(10).pow(18));

        // successful call, but with dust call
        await deployedNftAggregator.connect(second).multiAssetSwap(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
            ],
          ],
          [],
          [[deployedMock1155.address, [1, 2], [25, 30]]],
          combinedOrders,
          [[], [addresses["WETH"]], [0, 0]],
          { value: totalValue },
        );

        // 0 balance of WETH
        expect(await deployedWETH.balanceOf(deployedNftAggregator.address)).to.be.equal(0);

        const afterEthBalance = await ethers.provider.getBalance(second.address);
        expect(beforeEthBalance.sub(afterEthBalance)).to.be.gt(seaportTotalValue.add(looksrareTotalValue)); // gas fees
        expect(beforeEthBalance.sub(afterEthBalance)).to.be.lt(
          totalValue.sub(seaportTotalValue.add(looksrareTotalValue)),
        );

        // 1155 balances
        expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "1")).to.be.equal(25);
        expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "2")).to.be.equal(30);
        expect(await deployedMock1155.balanceOf(second.address, "1")).to.be.equal(75);
        expect(await deployedMock1155.balanceOf(second.address, "2")).to.be.equal(170);
      });
    });

    it("should have support for mooncats and cryptopunks", async function () {
      const inputSeed = "0xc5604c3e1d0c4e18b23eb1f08e063483d113eb74f4383268d034ffee6265cb02"; // random bytes32 seed
      await deployedMooncats.activate();
      await deployedCryptoPunks.setInitialOwner(owner.address, "1");
      await deployedCryptoPunks.setInitialOwner(second.address, "2");
      expect(await deployedCryptoPunks.balanceOf(owner.address)).to.be.equal(1);
      expect(await deployedCryptoPunks.balanceOf(second.address)).to.be.equal(1);
      expect(await deployedCryptoPunks.punksRemainingToAssign()).to.be.equal(10000 - 2);

      await deployedCryptoPunks.connect(second).offerPunkForSale("2", 0);

      const catId = await deployedMooncats.connect(second).callStatic.rescueCat(inputSeed);
      const tx = await deployedMooncats.connect(second).rescueCat(inputSeed);
      const rc = await tx.wait(); // 0ms, as tx is already confirmed
      const event = rc.events.find((event) => event.event === "CatRescued");
      const [, catId2] = event.args;
      expect(catId).to.be.equal(catId2);
      expect(await deployedMooncats.rescueIndex()).to.be.equal(1);
      expect(await deployedMooncats.balanceOf(second.address)).to.be.equal(1);
      const mooncatTID = hre.ethers.BigNumber.from(catId);
      await deployedMooncats.connect(second).makeAdoptionOfferToAddress(catId, 0, deployedNftAggregator.address);

      const recipient = second.address;
      const offerer = owner.address;

      const seaportTokenIds = ["1", "2"];
      const looksrareTokenIds = ["3", "4"];
      const erc1155 = [
        {
          to: recipient,
          id: "1",
          amount: 100,
          data: "",
        },
        {
          to: recipient,
          id: "2",
          amount: 200,
          data: "",
        },
      ];

      for (let i = 0; i < seaportTokenIds.length; i++) {
        await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
      }

      for (let i = 0; i < looksrareTokenIds.length; i++) {
        await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
      }

      for (let i = 0; i < erc1155.length; i++) {
        await deployedMock1155.connect(owner).mint(erc1155[i].to, erc1155[i].id, erc1155[i].amount, erc1155[i].data);
      }

      expect(await deployedMock1155.balanceOf(recipient, "1")).to.be.equal(100);
      expect(await deployedMock1155.balanceOf(recipient, "2")).to.be.equal(200);

      // ====================================================================================================
      const addresses = await getLooksrareAddresses(chainId);
      const nonce = await getLooksrareNonce(offerer, chainId);
      const Test20 = await hre.ethers.getContractFactory("Test20");
      const deployedTest20 = await Test20.connect(second).deploy();

      expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
        hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
      );

      const looksrareResults = await Promise.all(
        looksrareTokenIds.map((id, index) =>
          genLooksrareHelper(
            id,
            addresses["WETH"],
            addresses,
            Number(nonce) + Number(index) + 9,
            "0.001",
            deployedMock721.address,
          ),
        ),
      );

      const TestWETH = await hre.ethers.getContractFactory("WETH");
      const deployedWETH = await TestWETH.attach(addresses["WETH"]);
      const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
      await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
      const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

      expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

      // approve
      await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
      await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
      await deployedMock1155.connect(second).setApprovalForAll(deployedNftAggregator.address, true);

      expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
      expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

      // one time approval for ERC20s
      await deployedNftAggregator.setOneTimeApproval([
        {
          token: addresses["WETH"],
          operator: addresses["EXCHANGE"],
          amount: MAX_INT,
        },
        {
          token: deployedTest20.address,
          operator: addresses["EXCHANGE"],
          amount: MAX_INT,
        },
        {
          token: addresses["WETH"],
          operator: CROSS_CHAIN_SEAPORT_ADDRESS,
          amount: MAX_INT,
        },
        {
          token: deployedTest20.address,
          operator: CROSS_CHAIN_SEAPORT_ADDRESS,
          amount: MAX_INT,
        },
      ]);

      expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
      expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
        MAX_INT,
      );
      expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
        MAX_INT,
      );

      // ====================================================================================================

      const seaportResults = await Promise.all(
        seaportTokenIds.map((id, index) =>
          genSeaportHelper(
            id,
            index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
            index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
          ),
        ),
      );

      // orderStruct for SeaportLibV1_1
      const orderStruct = [
        [
          generateParameters(seaportResults, 1),
          [],
          generateOfferArray(seaportResults.map((i) => i.data.offer)),
          generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          recipient,
          seaportResults.length,
        ],
      ];

      const seaportTotalValue = getSeaportTotalValue(seaportResults);

      const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

      const failIfRevert = true;

      const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
      const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

      const genHex = libraryCall(
        "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
        wholeHex.slice(10),
      );

      const setData = {
        tradeData: genHex,
        value: seaportTotalValue,
        marketId: "1",
      };

      const combinedOrders = [setData].concat(looksrareResults);
      const beforeEthBalance = await ethers.provider.getBalance(second.address);

      // add an extra 1 ETH
      const totalValue = seaportTotalValue.add(looksrareTotalValue).add(hre.ethers.BigNumber.from(10).pow(18));

      // successful call, but with dust call
      await deployedNftAggregator.connect(second).multiAssetSwap(
        [
          [deployedTest20.address, addresses["WETH"]],
          [
            hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
              hre.ethers.BigNumber.from(10).pow(15),
            ), // testERC20 only for seaport
            hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
          ],
        ],
        [
          [deployedMooncats.address, [deployedNftAggregator.address], [mooncatTID]],
          [deployedCryptoPunks.address, [deployedNftAggregator.address], ["2"]],
        ],
        [[deployedMock1155.address, [1, 2], [25, 30]]],
        combinedOrders,
        [[], [addresses["WETH"]], [0, 0]],
        { value: totalValue },
      );

      // 0 balance of WETH
      expect(await deployedWETH.balanceOf(deployedNftAggregator.address)).to.be.equal(0);

      const afterEthBalance = await ethers.provider.getBalance(second.address);
      expect(beforeEthBalance.sub(afterEthBalance)).to.be.gt(seaportTotalValue.add(looksrareTotalValue)); // gas fees
      expect(beforeEthBalance.sub(afterEthBalance)).to.be.lt(
        totalValue.sub(seaportTotalValue.add(looksrareTotalValue)),
      );

      // 1155 balances
      expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "1")).to.be.equal(25);
      expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "2")).to.be.equal(30);
      expect(await deployedMock1155.balanceOf(second.address, "1")).to.be.equal(75);
      expect(await deployedMock1155.balanceOf(second.address, "2")).to.be.equal(170);

      expect(await deployedMooncats.balanceOf(second.address)).to.be.equal(0);
      expect(await deployedMooncats.balanceOf(deployedNftAggregator.address)).to.be.equal(1);

      expect(await deployedCryptoPunks.balanceOf(second.address)).to.be.equal(0);
      expect(await deployedCryptoPunks.balanceOf(deployedNftAggregator.address)).to.be.equal(1);

      await deployedNftAggregator.rescueMooncat([deployedMooncats.address, [owner.address], [mooncatTID]]);

      await deployedNftAggregator.rescuePunk([deployedCryptoPunks.address, [owner.address], ["2"]]);

      expect(await deployedMooncats.balanceOf(deployedNftAggregator.address)).to.be.equal(0);
      expect(await deployedMooncats.balanceOf(owner.address)).to.be.equal(1);
      expect(await deployedCryptoPunks.balanceOf(deployedNftAggregator.address)).to.be.equal(0);
      expect(await deployedCryptoPunks.balanceOf(owner.address)).to.be.equal(2);
    });

    it("should cover gov functions and fees on aggregator", async function () {
      await deployedNftAggregator.setOwner(second.address);
      await expect(deployedNftAggregator.connect(owner).acceptOwnership()).to.be.reverted;
      await deployedNftAggregator.connect(second).acceptOwnership();
      expect(await deployedNftAggregator.owner()).to.be.equal(second.address);
      await deployedNftAggregator.connect(second).setOwner(owner.address);
      await deployedNftAggregator.connect(owner).acceptOwnership();
      expect(await deployedNftAggregator.owner()).to.be.equal(owner.address);

      await deployedNftAggregator.setConverter("0x0000000000000000000000000000000000000000");
      await deployedNftAggregator.setNftProfile(deployedMock721.address);
      await deployedNftAggregator.setDao(addr1.address); // unused address
      const daoEthBalanceBefore = await ethers.provider.getBalance(addr1.address);

      await expect(deployedNftAggregator.setDaoFee(10001)).to.be.revertedWith("MAX_FEE_EXCEEDED");
      await deployedNftAggregator.setDaoFee(5000); // 50%
      await deployedNftAggregator.setBaseFee(hre.ethers.BigNumber.from(10).pow(16)); // 0.01 ETH minimum

      await deployedNftAggregator.setOpenForTrades(false);

      // trade setup
      const recipient = second.address;
      const offerer = owner.address;

      const seaportTokenIds = ["1", "2"];
      const looksrareTokenIds = ["3", "4"];
      const affiliateTokenId = "5";
      const erc1155 = [
        {
          to: recipient,
          id: "1",
          amount: 100,
          data: "",
        },
        {
          to: recipient,
          id: "2",
          amount: 200,
          data: "",
        },
      ];

      for (let i = 0; i < seaportTokenIds.length; i++) {
        await deployedMock721.connect(owner).mint(seaportTokenIds[i]);
      }

      for (let i = 0; i < looksrareTokenIds.length; i++) {
        await deployedMock721.connect(owner).mint(looksrareTokenIds[i]);
      }

      // mint tokenId 5 to affiliateUser
      await deployedMock721.connect(affiliateUser).mint(affiliateTokenId);
      const affiliateEthBalanceBefore = await ethers.provider.getBalance(affiliateUser.address);

      for (let i = 0; i < erc1155.length; i++) {
        await deployedMock1155.connect(owner).mint(erc1155[i].to, erc1155[i].id, erc1155[i].amount, erc1155[i].data);
      }

      expect(await deployedMock1155.balanceOf(recipient, "1")).to.be.equal(100);
      expect(await deployedMock1155.balanceOf(recipient, "2")).to.be.equal(200);

      // ====================================================================================================
      const addresses = await getLooksrareAddresses(chainId);
      const nonce = await getLooksrareNonce(offerer, chainId);
      const Test20 = await hre.ethers.getContractFactory("Test20");
      const deployedTest20 = await Test20.connect(second).deploy();

      expect(await deployedTest20.balanceOf(second.address)).to.be.equal(
        hre.ethers.BigNumber.from(1000000000).mul(hre.ethers.BigNumber.from(10).pow(18)),
      );

      const looksrareResults = await Promise.all(
        looksrareTokenIds.map((id, index) =>
          genLooksrareHelper(
            id,
            addresses["WETH"],
            addresses,
            Number(nonce) + Number(index) + 11,
            "0.001",
            deployedMock721.address,
          ),
        ),
      );

      const TestWETH = await hre.ethers.getContractFactory("WETH");
      const deployedWETH = await TestWETH.attach(addresses["WETH"]);
      const wethBalanceBefore = await deployedWETH.balanceOf(second.address);
      await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedWETH.connect(second).deposit({ value: hre.ethers.BigNumber.from(10).pow(17) }); // 0.1 ETH
      const wethBalanceAfter = await deployedWETH.balanceOf(second.address);

      expect(wethBalanceAfter.sub(wethBalanceBefore)).to.be.equal(hre.ethers.BigNumber.from(10).pow(17));

      // approve
      await deployedTest20.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedWETH.connect(second).approve(deployedNftAggregator.address, MAX_INT);
      await deployedTest20.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
      await deployedWETH.connect(second).approve(CROSS_CHAIN_SEAPORT_ADDRESS, MAX_INT);
      await deployedMock1155.connect(second).setApprovalForAll(deployedNftAggregator.address, true);

      expect(await deployedTest20.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(second.address, deployedNftAggregator.address)).to.be.equal(MAX_INT);
      expect(await deployedTest20.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(second.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(MAX_INT);

      // one time approval for ERC20s
      await deployedNftAggregator.setOneTimeApproval([
        {
          token: addresses["WETH"],
          operator: addresses["EXCHANGE"],
          amount: MAX_INT,
        },
        {
          token: deployedTest20.address,
          operator: addresses["EXCHANGE"],
          amount: MAX_INT,
        },
        {
          token: addresses["WETH"],
          operator: CROSS_CHAIN_SEAPORT_ADDRESS,
          amount: MAX_INT,
        },
        {
          token: deployedTest20.address,
          operator: CROSS_CHAIN_SEAPORT_ADDRESS,
          amount: MAX_INT,
        },
      ]);

      expect(await deployedTest20.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
      expect(await deployedWETH.allowance(deployedNftAggregator.address, addresses["EXCHANGE"])).to.be.equal(MAX_INT);
      expect(await deployedTest20.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
        MAX_INT,
      );
      expect(await deployedWETH.allowance(deployedNftAggregator.address, CROSS_CHAIN_SEAPORT_ADDRESS)).to.be.equal(
        MAX_INT,
      );

      // ====================================================================================================

      const seaportResults = await Promise.all(
        seaportTokenIds.map((id, index) =>
          genSeaportHelper(
            id,
            index % 2 == 0 ? "0x0000000000000000000000000000000000000000" : deployedTest20.address, // even = ETH, odd = test ERC20
            index % 2 == 0 ? "0.012" : "0.001", // smaller amount for test ERC20
          ),
        ),
      );

      // orderStruct for SeaportLibV1_1
      const orderStruct = [
        [
          generateParameters(seaportResults, 1),
          [],
          generateOfferArray(seaportResults.map((i) => i.data.offer)),
          generateOrderConsiderationArray(seaportResults.map((i) => i.data.consideration)),
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          recipient,
          seaportResults.length,
        ],
      ];

      const seaportTotalValue = getSeaportTotalValue(seaportResults);

      const looksrareTotalValue = getLooksrareTotalValue(looksrareResults);

      const failIfRevert = true;

      const inputData = [orderStruct, [seaportTotalValue], failIfRevert];
      const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

      const genHex = libraryCall(
        "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
        wholeHex.slice(10),
      );

      const setData = {
        tradeData: genHex,
        value: seaportTotalValue,
        marketId: "1",
      };

      const combinedOrders = [setData].concat(looksrareResults);
      const beforeEthBalance = await ethers.provider.getBalance(second.address);

      // add an extra 1 ETH
      const totalValue = seaportTotalValue.add(looksrareTotalValue).add(hre.ethers.BigNumber.from(10).pow(18));

      // fails due to openForTrades = false
      await expect(
        deployedNftAggregator.connect(second).multiAssetSwap(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
            ],
          ],
          [],
          [[deployedMock1155.address, [1, 2], [25, 30]]],
          combinedOrders,
          [[], [addresses["WETH"]], [0, 0]],
          { value: totalValue },
        ),
      ).to.be.revertedWith("TradingNotOpen");

      await deployedNftAggregator.setOpenForTrades(true);

      const profileTokenId = "5"; // paid to affiliateUser.address
      const insufficientFee = hre.ethers.BigNumber.from(10).pow(15); // 0.001
      const additionalEthFee = hre.ethers.BigNumber.from(10).pow(17); // 0.1 ETH

      // reverts due to not meeting the minimum base fee
      await expect(
        deployedNftAggregator.connect(second).multiAssetSwap(
          [
            [deployedTest20.address, addresses["WETH"]],
            [
              hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
                hre.ethers.BigNumber.from(10).pow(15),
              ), // testERC20 only for seaport
              hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
            ],
          ],
          [],
          [[deployedMock1155.address, [1, 2], [25, 30]]],
          combinedOrders,
          [[], [addresses["WETH"]], [profileTokenId, insufficientFee]],
          { value: totalValue.add(insufficientFee) },
        ),
      ).to.be.revertedWith("UNMET_BASE_FEE");

      // trade
      await deployedNftAggregator.connect(second).multiAssetSwap(
        [
          [deployedTest20.address, addresses["WETH"]],
          [
            hre.ethers.BigNumber.from(seaportTokenIds.filter((i) => i % 2 != 0).length).mul(
              hre.ethers.BigNumber.from(10).pow(15),
            ), // testERC20 only for seaport
            hre.ethers.BigNumber.from(looksrareTokenIds.length + 1).mul(hre.ethers.BigNumber.from(10).pow(15)), // add a little extra WETH
          ],
        ],
        [],
        [[deployedMock1155.address, [1, 2], [25, 30]]],
        combinedOrders,
        [[], [addresses["WETH"]], [profileTokenId, additionalEthFee]],
        { value: totalValue.add(additionalEthFee) },
      );

      const daoEthBalanceAfter = await ethers.provider.getBalance(addr1.address);
      const affiliateEthBalanceAfter = await ethers.provider.getBalance(affiliateUser.address);

      // 50 / 50 split of the 0.1 ETH
      expect(daoEthBalanceAfter.sub(daoEthBalanceBefore)).to.be.equal(additionalEthFee.div(2));
      expect(affiliateEthBalanceAfter.sub(affiliateEthBalanceBefore)).to.be.equal(additionalEthFee.div(2));

      // 0 balance of WETH
      expect(await deployedWETH.balanceOf(deployedNftAggregator.address)).to.be.equal(0);

      const afterEthBalance = await ethers.provider.getBalance(second.address);
      expect(beforeEthBalance.sub(afterEthBalance)).to.be.gt(seaportTotalValue.add(looksrareTotalValue)); // gas fees
      expect(beforeEthBalance.sub(afterEthBalance)).to.be.lt(
        totalValue.sub(seaportTotalValue.add(looksrareTotalValue)),
      );

      // 1155 balances
      expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "1")).to.be.equal(25);
      expect(await deployedMock1155.balanceOf(deployedNftAggregator.address, "2")).to.be.equal(30);
      expect(await deployedMock1155.balanceOf(second.address, "1")).to.be.equal(75);
      expect(await deployedMock1155.balanceOf(second.address, "2")).to.be.equal(170);
    });
  } catch (err) {
    console.log("error: ", JSON.stringify(err.response, null, 2));
  }
});
