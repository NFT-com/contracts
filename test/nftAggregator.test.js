const { expect } = require("chai");
const looksrareABI = require("../looksrareABI.json");
const seaportABI = require("../seaportABI.json");
const axios = require("axios");
const { ethers } = require("hardhat");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;
    let MarketplaceRegistry, deployedMarketplaceRegistry;
    let LooksrareLibV1, deployedLooksrareLibV1;
    let OpenseaLibV1, deployedOpenseaLibV1;
    let SeaportLib1_1, deployedSeaportLib1_1;
    let Mock721;
    let looksrare = new ethers.utils.Interface(looksrareABI);
    let seaport = new ethers.utils.Interface(seaportABI);
    let seaportLib = new ethers.utils.Interface(
      `[{"inputs":[],"name":"InputLengthMismatch","type":"error"},{"inputs":[],"name":"OPENSEA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"address","name":"offerer","type":"address"},{"internalType":"address","name":"zone","type":"address"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"}],"internalType":"struct OfferItem[]","name":"offer","type":"tuple[]"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"},{"internalType":"address payable","name":"recipient","type":"address"}],"internalType":"struct ConsiderationItem[]","name":"consideration","type":"tuple[]"},{"internalType":"enum OrderType","name":"orderType","type":"uint8"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bytes32","name":"zoneHash","type":"bytes32"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes32","name":"conduitKey","type":"bytes32"},{"internalType":"uint256","name":"totalOriginalConsiderationItems","type":"uint256"}],"internalType":"struct OrderParameters","name":"parameters","type":"tuple"},{"internalType":"uint120","name":"numerator","type":"uint120"},{"internalType":"uint120","name":"denominator","type":"uint120"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"bytes","name":"extraData","type":"bytes"}],"internalType":"struct AdvancedOrder[]","name":"advancedOrders","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"enum Side","name":"side","type":"uint8"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"identifier","type":"uint256"},{"internalType":"bytes32[]","name":"criteriaProof","type":"bytes32[]"}],"internalType":"struct CriteriaResolver[]","name":"criteriaResolvers","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"offerFulfillments","type":"tuple[][]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"considerationFulfillments","type":"tuple[][]"},{"internalType":"bytes32","name":"fulfillerConduitKey","type":"bytes32"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"maximumFulfilled","type":"uint256"}],"internalType":"struct SeaportLib1_1.SeaportBuyOrder[]","name":"openSeaBuys","type":"tuple[]"},{"internalType":"uint256[]","name":"msgValue","type":"uint256[]"},{"internalType":"bool","name":"revertIfTrxFails","type":"bool"}],"name":"fulfillAvailableAdvancedOrders","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
    );

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      Mock721 = await ethers.getContractFactory("GenesisKey");
      LooksrareLibV1 = await ethers.getContractFactory("LooksrareLibV1");
      deployedLooksrareLibV1 = await LooksrareLibV1.deploy();
      OpenseaLibV1 = await ethers.getContractFactory("OpenseaLibV1");
      deployedOpenseaLibV1 = await OpenseaLibV1.deploy();
      SeaportLib1_1 = await ethers.getContractFactory("SeaportLib1_1");
      deployedSeaportLib1_1 = await SeaportLib1_1.deploy();

      console.log("deployedLooksrareLibV1: ", deployedLooksrareLibV1.address);
      console.log("deployedOpenseaLibV1: ", deployedOpenseaLibV1.address);
      console.log("deployedSeaportLib1_1: ", deployedSeaportLib1_1.address);

      MarketplaceRegistry = await ethers.getContractFactory("MarketplaceRegistry");
      deployedMarketplaceRegistry = await upgrades.deployProxy(MarketplaceRegistry, [], {
        kind: "uups",
      });

      deployedMarketplaceRegistry.addMarketplace(deployedLooksrareLibV1.address, true);
      deployedMarketplaceRegistry.addMarketplace(deployedOpenseaLibV1.address, true);
      deployedMarketplaceRegistry.addMarketplace(deployedSeaportLib1_1.address, true);

      console.log("deployedMarketplaceRegistry: ", deployedMarketplaceRegistry.address);

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(NftAggregator, [deployedMarketplaceRegistry.address], {
        kind: "uups",
        unsafeAllow: ["delegatecall"],
      });

      console.log("deployedNftAggregator: ", deployedNftAggregator.address);
    });

    const getLooksrareOrder = async (isOrderAsk = true, contract, tokenId, status = "VALID") => {
      try {
        let baseUrl = `https://api-rinkeby.looksrare.org/api/v1`;
        let url = `${baseUrl}/orders?isOrderAsk=${isOrderAsk}&collection=${contract}&status%5B%5D=${status}&tokenId=${tokenId}&sort=PRICE_ASC`;
        const config = {
          headers: { Accept: "application/json" },
        };
        return (await axios.get(url, config)).data;
      } catch (err) {
        console.log("error with looksrare order:", err);
        return err;
      }
    };

    const getSeaportOrder = async (
      contract,
      tokenId,
      limit = 1,
      OPENSEA_API_KEY = "2829e29e1ae34375a3cc5f4eee84e190",
    ) => {
      try {
        const baseUrl = `https://testnets-api.opensea.io/v2`;
        let url = `${baseUrl}/orders/rinkeby/seaport/listings?asset_contract_address=${contract}&token_ids=${tokenId}&limit=${limit}`;
        const config = {
          headers: { Accept: "application/json" }, // 'X-API-KEY': OPENSEA_API_KEY // TODO: only use for PROD
        };
        return (await axios.get(url, config)).data;
      } catch (err) {
        console.log("error with looksrare order:", err);
        return err;
      }
    };

    describe("NFT Aggregation", async function () {
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
        const contractAddress = "0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b";
        const tokenID = "1441796";
        const data = await getLooksrareOrder(true, contractAddress, tokenID);

        const {
          hash,
          collectionAddress,
          tokenId,
          isOrderAsk,
          signer,
          strategy,
          currencyAddress,
          amount,
          price,
          nonce,
          startTime,
          endTime,
          minPercentageToAsk,
          params,
          status,
          signature,
          v,
          r,
          s,
        } = data.data[0];

        // rinkeby nft aggregator
        const executorAddress = "0x6579A513E97C0043dC3Ad9Dfd3f804721023a309";
        const generatedHex = await looksrare.encodeFunctionData("matchAskWithTakerBidUsingETHAndWETH", [
          {
            isOrderAsk: false,
            taker: executorAddress,
            price,
            tokenId,
            minPercentageToAsk,
            params: params || "0x",
          },
          {
            isOrderAsk,
            signer,
            collection: collectionAddress,
            price,
            tokenId,
            amount,
            strategy,
            currency: currencyAddress,
            nonce,
            startTime,
            endTime,
            minPercentageToAsk,
            params: params || "0x",
            v,
            r,
            s,
          },
        ]);

        console.log("generatedHex: ", generatedHex);

        const marketId = 0; // looksrare
        const value = 0;
        await deployedNftAggregator.connect(owner).batchTrade([
          // ERC20Details
          {
            tokenAddrs: [],
            amounts: [],
          },
          [marketId, value, generatedHex],
          [], // dust tokens
        ]);
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
          [[{ orderIndex: "0", itemIndex: "0" }]],
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

      it("should create opensea generated hexes for arbitrary seaport orders", async function () {
        const contractAddress = "0x2d5d5e4efbd13c2347013d4c9f3c5c666f18d55c";
        const contractNft = await Mock721.attach(contractAddress);
        const tokenId = "2";
        const recipient = "0x338eFdd45AE7D010da108f39d293565449C52682";

        // rinkeby zone: 0x00000000e88fe2628ebc5da81d2b3cead633e89e
        // mainnet zone: 0x004c00500000ad104d7dbd00e3ae0a5c00560c00
        const zone = "0x00000000e88fe2628ebc5da81d2b3cead633e89e";

        const data = await getSeaportOrder(contractAddress, tokenId, 5);
        const order = data?.orders[0];

        // input data for SeaportLibV1_1
        const inputData = [
          [
            [
              [
                {
                  denominator: "1",
                  numerator: "1",
                  parameters: {
                    conduitKey: order.protocol_data.parameters.conduitKey,
                    consideration: order.protocol_data.parameters.consideration,
                    endTime: order.protocol_data.parameters.endTime,
                    offer: order.protocol_data.parameters.offer,
                    offerer: order.protocol_data.parameters.offerer, // seller
                    orderType: order.protocol_data.parameters.orderType,
                    salt: order.protocol_data.parameters.salt,
                    startTime: order.protocol_data.parameters.startTime,
                    totalOriginalConsiderationItems: order.protocol_data.parameters.totalOriginalConsiderationItems,
                    zone: zone, // opensea pausable zone
                    zoneHash: order.protocol_data.parameters.zoneHash,
                  },
                  signature: order.protocol_data.signature,
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
              ],
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
                [
                  {
                    orderIndex: "0",
                    itemIndex: "2",
                  },
                ],
              ],
              "0x0000000000000000000000000000000000000000000000000000000000000000",
              recipient,
              "1",
            ],
          ],
          ["17800000000000000"],
          true,
        ];

        const genHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);

        // console.log('genHex: ', genHex);

        expect(await contractNft.ownerOf(2)).to.be.equal("0x59495589849423692778a8c5aaCA62CA80f875a4");

        await deployedNftAggregator.batchTrade(
          {
            tokenAddrs: [],
            amounts: [],
          },
          [
            {
              marketId: 2, // seaport 1.1
              value: "17800000000000000", // 0.0178 ETH
              tradeData: genHex,
            },
          ],
          [],
        );

        console.log("owner after: ", await contractNft.ownerOf(2));
        console.log("constant recipient: ", recipient);
      });
    });
  } catch (err) {
    console.log("error: ", JSON.stringify(err.response, null, 2));
  }
});
