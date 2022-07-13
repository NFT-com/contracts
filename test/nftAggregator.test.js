const { expect } = require("chai");
const looksrareABI = require("../looksrareABI.json");

describe("NFT Aggregator", function () {
  try {
    let NftAggregator, deployedNftAggregator;
    let looksrare = new ethers.utils.Interface(looksrareABI);

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      NftAggregator = await ethers.getContractFactory("NftAggregator");
      deployedNftAggregator = await upgrades.deployProxy(NftAggregator, [], {
        kind: "uups",
      });
    });

    describe("NFT Aggregation", async function () {
      it("should allow nft aggregation parameter creationg on looksrare", async function () {
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

        // const generatedHex = await looksrare.encodeFunctionData("matchAskWithTakerBid", [
        //   {
        //     isOrderAsk: false,
        //     taker: "0x59495589849423692778a8c5aaCA62CA80f875a4",
        //     price: "25000000000000000",
        //     tokenId: 1,
        //     minPercentageToAsk: 7500,
        //     params: "0x",
        //   },
        //   {
        //     isOrderAsk: true,
        //     signer: "0x6245Cc08E29ca462f9bae9B18fD31e2a83927705",
        //     collection: "0x33AcFb7d8eF4FBEeb4d837c7E90B8F74E219DAf7",
        //     price: "25000000000000000",
        //     tokenId: 1,
        //     amount: 1,
        //     strategy: "0x732319A3590E4fA838C111826f9584a9A2fDEa1a",
        //     currency: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
        //     nonce: 0,
        //     startTime: 1657491493,
        //     endTime: 1673047035,
        //     minPercentageToAsk: 7500,
        //     params: "0x",
        //     v: 28,
        //     r: "0xe19a51cc67d9b99cdb06562a2f42d4d8589bf950996b6a1b2fab6d6cf469c076",
        //     s: "0x7e6d98660f43cf7ba183e447c62d63a0bfcf7b267b23ed128279a6b2aa86758c",
        //   },
        // ]);
        
        // await deployedNftAggregator.connect(owner).purchaseLooksrare([
        //   [
        //     0, 0, generatedHex
        //   ]
        // ]);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
