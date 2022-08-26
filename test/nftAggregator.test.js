const { expect } = require("chai");
const looksrareABI = require("../abis/looksrare.json");
const seaportABI = require("../abis/seaport.json");
const { ethers } = require("hardhat");
const {
  createLooksrareParametersForNFTListing,
  getLooksrareNonce,
  useLooksrareRoyaltyFeeRegistryContractContract,
  getLooksrareAddresses,
  useLooksrareStrategyContract,
  signOrderForLooksrare,
} = require("./utils/aggregator/looksrareHelper");
const { libraryCall } = require("../test/utils/aggregator/index");
const { createSeaportParametersForNFTListing, signOrderForOpensea } = require("./utils/aggregator/seaportHelper");
const { OPENSEA_CONDUIT_ADDRESS } = require("./utils/aggregator/types");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;
    let MarketplaceRegistry, deployedMarketplaceRegistry;
    let LooksrareLibV1, deployedLooksrareLibV1;
    let SeaportLib1_1, deployedSeaportLib1_1;
    let Mock721, deployedMock721;
    let looksrare = new ethers.utils.Interface(looksrareABI);
    let seaport = new ethers.utils.Interface(seaportABI);
    const ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

    // TODO: change once opensea supports goerli fully with Zones
    const chainId = 4; // 5 = goerli, hre.network.config.chainId

    const looksrareLib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InvalidChain","type":"error"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"tradeData","type":"bytes"},{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bool","name":"revertTxFail","type":"bool"}],"name":"_tradeHelper","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]`,
    );
    const seaportLib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InputLengthMiconstsmatch","type":"error"},{"inputs":[],"name":"OPENSEA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"address","name":"offerer","type":"address"},{"internalType":"address","name":"zone","type":"address"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"}],"internalType":"struct OfferItem[]","name":"offer","type":"tuple[]"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"},{"internalType":"address payable","name":"recipient","type":"address"}],"internalType":"struct ConsiderationItem[]","name":"consideration","type":"tuple[]"},{"internalType":"enum OrderType","name":"orderType","type":"uint8"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bytes32","name":"zoneHash","type":"bytes32"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes32","name":"conduitKey","type":"bytes32"},{"internalType":"uint256","name":"totalOriginalConsiderationItems","type":"uint256"}],"internalType":"struct OrderParameters","name":"parameters","type":"tuple"},{"internalType":"uint120","name":"numerator","type":"uint120"},{"internalType":"uint120","name":"denominator","type":"uint120"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"bytes","name":"extraData","type":"bytes"}],"internalType":"struct AdvancedOrder[]","name":"advancedOrders","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"enum Side","name":"side","type":"uint8"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"identifier","type":"uint256"},{"internalType":"bytes32[]","name":"criteriaProof","type":"bytes32[]"}],"internalType":"struct CriteriaResolver[]","name":"criteriaResolvers","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"offerFulfillments","type":"tuple[][]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"considerationFulfillments","type":"tuple[][]"},{"internalType":"bytes32","name":"fulfillerConduitKey","type":"bytes32"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"maximumFulfilled","type":"uint256"}],"internalType":"struct SeaportLib1_1.SeaportBuyOrder[]","name":"openSeaBuys","type":"tuple[]"},{"internalType":"uint256[]","name":"msgValue","type":"uint256[]"},{"internalType":"bool","name":"revertIfTrxFails","type":"bool"}],"name":"fulfillAvailableAdvancedOrders","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
    );

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      LooksrareLibV1 = await ethers.getContractFactory("LooksrareLibV1");
      Mock721 = await ethers.getContractFactory("Test721");
      deployedMock721 = await Mock721.deploy();
      deployedLooksrareLibV1 = await LooksrareLibV1.deploy();
      SeaportLib1_1 = await ethers.getContractFactory("SeaportLib1_1");
      deployedSeaportLib1_1 = await SeaportLib1_1.deploy();

      MarketplaceRegistry = await ethers.getContractFactory("MarketplaceRegistry");
      deployedMarketplaceRegistry = await upgrades.deployProxy(MarketplaceRegistry, [], {
        kind: "uups",
      });

      await deployedMarketplaceRegistry.addMarketplace(deployedLooksrareLibV1.address, true);
      await deployedMarketplaceRegistry.addMarketplace(deployedSeaportLib1_1.address, true);

      expect((await deployedMarketplaceRegistry.marketplaces(0)).proxy).to.be.equal(deployedLooksrareLibV1.address);
      expect((await deployedMarketplaceRegistry.marketplaces(1)).proxy).to.be.equal(deployedSeaportLib1_1.address);

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(NftAggregator, [deployedMarketplaceRegistry.address], {
        kind: "uups",
        unsafeAllow: ["delegatecall"],
      });
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

      it("should allow user to user to list on looksrare and other user to purchase it", async function () {
        const INFURA_KEY = "460ed70fa7394604a709b7dff23f1641";
        const provider = new ethers.providers.InfuraProvider(
          chainId == 5 ? "goerli" : chainId == 4 ? "rinkeby" : "homestead",
          INFURA_KEY,
        );

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
        const duration = hre.ethers.BigNumber.from(60 * 60 * 24); // 24 hours

        // approve
        await deployedMock721.connect(owner).setApprovalForAll(addresses["TRANSFER_MANAGER_ERC721"], true);

        const order = await createLooksrareParametersForNFTListing(
          offerer,
          contractAddress,
          hre.ethers.BigNumber.from(tokenID), // tokenId
          hre.ethers.BigNumber.from("12000000000000000"), // price
          currency,
          chainId,
          await getLooksrareNonce(offerer, chainId), // nonce
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

        // goerli nft aggregator
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

        const genHex = await libraryCall("_tradeHelper(uint256,bytes,address,uint256,bool)", wholeHex.slice(10));

        const totalValue = hre.ethers.BigNumber.from(price);

        const marketId = 0; // looksrare
        const value = totalValue; // wei sent
        try {
          await deployedNftAggregator
            .connect(second)
            .batchTradeWithETH([{ marketId, value, tradeData: genHex }], [], { value: totalValue });
        } catch (err) {
          console.log("error while batch trading: ", err);
        }

        expect(await deployedMock721.ownerOf(tokenID)).to.be.equal(second.address);
      });

      it("should create opensea generated hexes for arbitrary seaport orders", async function () {
        await deployedMock721.connect(owner).mint("1");
        await deployedMock721.connect(owner).mint("2");
        await deployedMock721.connect(owner).mint("3");
        await deployedMock721.connect(owner).mint("56");

        const offerer = owner.address;
        const contractAddress = deployedMock721.address;
        const tokenId = "1"; // 56
        const duration = hre.ethers.BigNumber.from(60 * 60 * 24); // 24 hours
        const recipient = second.address;
        const currency = "0x0000000000000000000000000000000000000000"; // ETH
        const startingPrice = hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString());
        const endingPrice = hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString());

        const INFURA_KEY = "460ed70fa7394604a709b7dff23f1641";
        const provider = new ethers.providers.InfuraProvider(
          chainId == "5" ? "goerli" : chainId == "4" ? "rinkeby" : "homestead",
          INFURA_KEY,
        );

        expect(await deployedMock721.ownerOf(tokenId)).to.be.equal(owner.address);

        // approve
        await deployedMock721.connect(owner).setApprovalForAll(OPENSEA_CONDUIT_ADDRESS, true);

        const collectionFee = null; // since this is a dummy 721 contract that has no royalties

        const data = createSeaportParametersForNFTListing(
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
                extraData: "0x",
              },
            ],
            [],
            [
              [
                {
                  orderIndex: "0",
                  itemIndex: "0",
                },
              ],
            ], // TODO: automate these arrays
            [
              [
                {
                  orderIndex: "0",
                  itemIndex: "0",
                },
              ],
              [
                {
                  orderIndex: "0",
                  itemIndex: "1",
                },
              ],
            ],
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            recipient,
            "1",
          ],
        ];

        const totalValue = startingPrice;
        const failIfRevert = true;

        const inputData = [orderStruct, [startingPrice], failIfRevert];
        const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        const genHex = await libraryCall(
          "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
          wholeHex.slice(10),
        );

        const setData = {
          tradeData: genHex,
          value: startingPrice,
          marketId: "1",
        };

        const combinedOrders = [setData];

        const tx = await deployedNftAggregator
          .connect(owner)
          .batchTradeWithETH(combinedOrders, [], { value: totalValue });

        expect(await deployedMock721.ownerOf(tokenId)).to.be.equal(second.address);
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
    });
  } catch (err) {
    console.log("error: ", JSON.stringify(err.response, null, 2));
  }
});
