const { expect } = require("chai");
const { BigNumber } = require("ethers");

// TODO: plan
// setup marketplace environment
// setup origination contract
// setup bitpacking code locally to test address + index + maxSupply uint256
// safeTransferFrom should mint when the supply < amount traded
// upon `executeSwap`, the swap should originate a new NFT

describe("Origination Testing", function () {
  try {
    const ADDRESS_BITS = 160;
    const INDEX_BITS = 56;
    const SUPPLY_BITS = 40;

    const SUPPLY_MASK = BigNumber.from(1).shl(SUPPLY_BITS).sub(BigNumber.from(1));
    const INDEX_MASK = BigNumber.from(1).shl(INDEX_BITS).sub(BigNumber.from(1)).xor(SUPPLY_MASK);

    const NULL_BYTES = "0x";

    // Pre-existing IDs from testing
    const id1 = "46717340037675052755967761757980282179977476415542244249795917787967648694273";
    const id2 = "85439735993382124668751690732986760340636919666515172646697212360011148166120";
    const id3 = "85439735993382124668751690732986760340636919666515172646697212361110659792906";

    const ids = [id1, id2, id3];
    const debug = false;

    const calculatedTokenMaxSupply = id => BigNumber.from(id).and(SUPPLY_MASK);
    const calculatedTokenIndex = id => BigNumber.from(id).and(INDEX_MASK).shr(SUPPLY_BITS);
    const calculatedOriginUint256 = id => BigNumber.from(BigNumber.from(id).shr(INDEX_BITS + SUPPLY_BITS)).shl(160);

    // helper function for encoding packed tokenId
    const createTokenId = (address, index, maxSupply) => {
      let addressBit = BigNumber.from(address);
      let indexBit = BigNumber.from(index);
      let supplyBit = BigNumber.from(maxSupply);

      return addressBit.shl(56).xor(indexBit).shl(40).xor(supplyBit).toString();
    };

    let Origination, deployedOrigination;

    beforeEach(async function () {
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      Origination = await hre.ethers.getContractFactory("Origination");

      deployedOrigination = await hre.upgrades.deployProxy(
        Origination,
        [], // no arguments
        { kind: "uups" },
      );

      await deployedOrigination
        .connect(owner)
        .setTemplateURI(`https://api.nft.com/v1/metadata/${deployedOrigination.address}/0x{_id}`);
    });

    describe("Origination Testing", async function () {
      it("should correctly validate basic bitwise operations", async function () {
        for (let i = 0; i < ids.length; i++) {
          let id = ids[i];

          expect(await deployedOrigination.tokenMaxSupply(id)).to.be.equal(calculatedTokenMaxSupply(id));
          if (debug) console.log(`id #${i} maxSupply: ${Number(calculatedTokenMaxSupply(id))}`);

          expect(await deployedOrigination.tokenIndex(id)).to.be.equal(calculatedTokenIndex(id));
          if (debug) console.log(`id #${i} tokenIndex: ${Number(calculatedTokenIndex(id))}`);

          expect(BigNumber.from(await deployedOrigination.origin(id)).shl(160)).to.be.equal(
            calculatedOriginUint256(id),
          );
          if (debug) console.log(`id #${i} origin: ${await deployedOrigination.origin(id)}`);
        }
      });

      it("should be able to recreate the bitpacked tokenIds from scratch", async function () {
        const rawInputs = [
          {
            maxSupply: 1,
            tokenIndex: 1,
            origin: "0x674913D21D70a9e1Ace0B94662ef297170483237",
          },
          {
            maxSupply: 1000,
            tokenIndex: 1,
            origin: "0xbCe52D4698fdE9484901121A7Feb0741BA6d4dF3",
          },
          {
            maxSupply: 10,
            tokenIndex: 2,
            origin: "0xbCe52D4698fdE9484901121A7Feb0741BA6d4dF3",
          },
        ];

        // this is the code for encoding a bitpacked tokenid
        // important for client / server to have this logic when we are minting new NFTs
        for (let i = 0; i < rawInputs.length; i++) {
          let input = rawInputs[i];
          let addressBit = BigNumber.from(input.origin);
          let indexBit = BigNumber.from(input.tokenIndex);
          let supplyBit = BigNumber.from(input.maxSupply);

          let bitpackedId = addressBit.shl(56).xor(indexBit).shl(40).xor(supplyBit);

          // double check ids match
          expect(BigNumber.from(ids[i])).to.be.equal(bitpackedId);
        }
      });

      it("should be able to create new NFT upon safeTransferFrom", async function () {
        let tokenId = createTokenId(owner.address, 1, 10);

        let uri = await deployedOrigination.uri(tokenId);

        // sanity check
        expect(uri).to.be.equal(`https://api.nft.com/v1/metadata/${deployedOrigination.address}/0x{_id}`);

        // current supply 0 + remaining supply 10
        expect(await deployedOrigination.balanceOf(owner.address, tokenId)).to.be.equal(10);

        // other person has 0
        expect(await deployedOrigination.balanceOf(second.address, tokenId)).to.be.equal(0);

        // reverts due to minting more than max supply
        await expect(deployedOrigination.safeTransferFrom(owner.address, second.address, tokenId, 11, NULL_BYTES)).to.be
          .reverted;

        // mints
        expect(
          await deployedOrigination
            .connect(owner)
            .safeTransferFrom(owner.address, second.address, tokenId, 10, NULL_BYTES),
        )
          .to.emit(deployedOrigination, "TransferSingle")
          .withArgs(owner.address, owner.address, second.address, tokenId, 10);

        expect(await deployedOrigination.balanceOf(owner.address, tokenId)).to.be.equal(0);

        // balance of second is now 10
        expect(await deployedOrigination.balanceOf(second.address, tokenId)).to.be.equal(10);
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
