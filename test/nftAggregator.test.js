const { expect } = require("chai");
const looksrareABI = require("../looksrareABI.json");
const seaportABI = require("../seaportABI.json");
const axios = require("axios");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;
    let MarketplaceRegistry, deployedMarketplaceRegistry;
    let LooksrareLibV1, deployedLooksrareLibV1;
    let OpenseaLibV1, deployedOpenseaLibV1;
    let looksrare = new ethers.utils.Interface(looksrareABI);
    let seaport = new ethers.utils.Interface(seaportABI);

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      LooksrareLibV1 = await ethers.getContractFactory("LooksrareLibV1");
      deployedLooksrareLibV1 = await LooksrareLibV1.deploy();
      OpenseaLibV1 = await ethers.getContractFactory("OpenseaLibV1");
      deployedOpenseaLibV1 = await OpenseaLibV1.deploy();

      console.log("deployedLooksrareLibV1: ", deployedLooksrareLibV1.address);
      console.log("deployedOpenseaLibV1: ", deployedOpenseaLibV1.address);

      MarketplaceRegistry = await ethers.getContractFactory("MarketplaceRegistry");
      deployedMarketplaceRegistry = await upgrades.deployProxy(MarketplaceRegistry, [], {
        kind: "uups",
      });

      deployedMarketplaceRegistry.addMarketplace(deployedLooksrareLibV1.address, true);
      deployedMarketplaceRegistry.addMarketplace(deployedOpenseaLibV1.address, true);
      // add seaport as well

      console.log("deployedMarketplaceRegistry: ", deployedMarketplaceRegistry.address);

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(NftAggregator, [deployedMarketplaceRegistry.address], {
        kind: "uups",
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
        const contractAddress = "0x33AcFb7d8eF4FBEeb4d837c7E90B8F74E219DAf7";
        const tokenID = "1";
        const data = await getLooksrareOrder(true, contractAddress, tokenID);

        const {
          hash, // : '0x734f4c78ef0a189272479a19f2e4c89e6941679e33071ed4c367fabcaf26c518',
          collectionAddress, // : '0x33AcFb7d8eF4FBEeb4d837c7E90B8F74E219DAf7',
          tokenId, // : '1',
          isOrderAsk, // : true,
          signer, // : '0x59495589849423692778a8c5aaCA62CA80f875a4',
          strategy, // : '0x732319A3590E4fA838C111826f9584a9A2fDEa1a',
          currencyAddress, // : '0xc778417E063141139Fce010982780140Aa0cD5Ab',
          amount, // : 1,
          price, // : '10000000000000000',
          nonce, // : '0',
          startTime, // : 1657721660,
          endTime, // : 1660313619,
          minPercentageToAsk, // : 7500,
          params, // : '',
          status, // : 'VALID',
          signature, // : '0x96040adebbe79c72c75b250be268097a6363fdfa0e1d9c0dde6a147311a4edbd063ce04564f3a3bf874fec5aa000644d49631154bb1d407fdf22461fb2f84a8d1c',
          v, // : 28,
          r, // : '0x96040adebbe79c72c75b250be268097a6363fdfa0e1d9c0dde6a147311a4edbd',
          s, // : '0x063ce04564f3a3bf874fec5aa000644d49631154bb1d407fdf22461fb2f84a8d'
        } = data.data[0];

        // rinkeby nft aggregator
        const executorAddress = "0x6579A513E97C0043dC3Ad9Dfd3f804721023a309";
        const generatedHex = await looksrare.encodeFunctionData("matchAskWithTakerBid", [
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
    });

    it("should allow user to purchase listed asset on seaport", async function () {
      // rinkeby nft aggregator
      const executorAddress = "0x6579A513E97C0043dC3Ad9Dfd3f804721023a309";
      const recipient = "";

      const generatedHex = await seaport.encodeFunctionData("fulfillAvailableAdvancedOrders", [
        {
          advancedOrders: [
            {
              parameters: {
                offerer: "0x91096b40fc4f7523835e5ecb133ab023188270f7", // seller
                zone: "0x004c00500000ad104d7dbd00e3ae0a5c00560c00", // opensea pausable zone
                offer: [
                  {
                    itemType: "2",
                    token: "0x3b3c2dacfdd7b620c8916a5f7aa6476bdfb1aa07", // nft collection
                    identifierOrCriteria: "9388", // tokenId
                    startAmount: "1",
                    endAmount: "1",
                  },
                ],
                consideration: [
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000", // ETH
                    identifierOrCriteria: "0",
                    startAmount: "21330000000000000",
                    endAmount: "21330000000000000", // 0.02133 ETH min
                    recipient: "0x91096b40fc4f7523835e5ecb133ab023188270f7", // seller
                  },
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "592500000000000",
                    endAmount: "592500000000000",
                    recipient: "0x8de9c5a032463c561423387a9648c5c7bcc5bc90", // opensea fees
                  },
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "1777500000000000",
                    endAmount: "1777500000000000",
                    recipient: "0x6bd835fafc4dade21875d576d4ba6f468e9c6bd7", // creator of collection royalties
                  },
                ],
                orderType: "2", // ???
                startTime: "1658140842",
                endTime: "1673692842",
                zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                salt: "26260796048459481",
                conduitKey: "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000", // opensea conduit key
                totalOriginalConsiderationItems: "3",
              },
              numerator: "1",
              denominator: "1",
              signature:
                "0xaaa9d6a8e62bae08cc701bf66427c1780ba7d69600e30f0af1c91b8123ab4f36320019069681534752321dd8f069293d1d03e8e4f212af0ac6bfb59039cd93881c",
            },
            {
              parameters: {
                offerer: "0x91096b40fc4f7523835e5ecb133ab023188270f7",
                zone: "0x004c00500000ad104d7dbd00e3ae0a5c00560c00",
                offer: [
                  {
                    itemType: "2",
                    token: "0x3b3c2dacfdd7b620c8916a5f7aa6476bdfb1aa07", // nft
                    identifierOrCriteria: "1107", // tokenId
                    startAmount: "1",
                    endAmount: "1",
                  },
                ],
                consideration: [
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "20700000000000000",
                    endAmount: "20700000000000000",
                    recipient: "0x91096b40fc4f7523835e5ecb133ab023188270f7",
                  },
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "574999999999999",
                    endAmount: "574999999999999",
                    recipient: "0x8de9c5a032463c561423387a9648c5c7bcc5bc90",
                  },
                  {
                    itemType: "0",
                    token: "0x0000000000000000000000000000000000000000",
                    identifierOrCriteria: "0",
                    startAmount: "1724999999999999",
                    endAmount: "1724999999999999",
                    recipient: "0x6bd835fafc4dade21875d576d4ba6f468e9c6bd7",
                  },
                ],
                orderType: "2",
                startTime: "1658140838",
                endTime: "1673692838",
                zoneHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                salt: "64324093163467031",
                conduitKey: "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000",
                totalOriginalConsiderationItems: "3",
              },
              numerator: "1",
              denominator: "1",
              signature:
                "0x1310bfa39179e3377148a41c2294878ebc966c523bbefc7cd2dd1a7f7a8fb3b578d30cafd15db441156c52cec3ecd81e4b79b9ec35038b3af4c8e31e3f7480ca1b",
            },
          ],
          criteriaResolvers: [],
          offerFulfillments: [
            [
              {
                orderIndex: "0",
                itemIndex: "0",
              },
            ],
            [
              {
                orderIndex: "1",
                itemIndex: "0",
              },
            ],
          ],
          considerationFulfillments: [
            [
              {
                orderIndex: "0",
                itemIndex: "0",
              },
              {
                orderIndex: "1",
                itemIndex: "0",
              },
            ],
            [
              {
                orderIndex: "0",
                itemIndex: "1",
              },
              {
                orderIndex: "1",
                itemIndex: "1",
              },
            ],
            [
              {
                orderIndex: "0",
                itemIndex: "2",
              },
              {
                orderIndex: "1",
                itemIndex: "2",
              },
            ],
          ],
          fulfillerConduitKey: "0x0000000000000000000000000000000000000000000000000000000000000000",
          recipient,
          maximumFulfilled: "2",
        },
      ]);

      console.log("generated hex opensea: ", genratedHex);
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
