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

    // Pre-existing IDs from testing
    const id1 = "46717340037675052755967761757980282179977476415542244249795917787967648694273";
    const id2 = "85439735993382124668751690732986760340636919666515172646697212360011148166120";
    const id3 = "85439735993382124668751690732986760340636919666515172646697212361110659792906";

    const ids = [id1, id2, id3];

    const calculatedTokenMaxSupply = id => BigNumber.from(id).and(SUPPLY_MASK);
    const calculatedTokenIndex = id => BigNumber.from(id).and(INDEX_MASK).shr(SUPPLY_BITS);
    const calculatedOriginUint256 = id => BigNumber.from(BigNumber.from(id).shr(INDEX_BITS + SUPPLY_BITS)).shl(160);

    let Origination, deployedOrigination;

    beforeEach(async function () {
      [owner, second, addr1, ...addrs] = await ethers.getSigners();

      Origination = await hre.ethers.getContractFactory("Origination");

      deployedOrigination = await hre.upgrades.deployProxy(
        Origination,
        [], // no arguments
        { kind: "uups" },
      );
    });

    describe("Origination Testing", async function () {
      it("Basic Bitwise Validation", async function () {
        for (let i = 0; i < ids.length; i++) {
          let id = ids[i];

          expect(await deployedOrigination.tokenMaxSupply(id)).to.be.equal(calculatedTokenMaxSupply(id));
          expect(await deployedOrigination.tokenIndex(id)).to.be.equal(calculatedTokenIndex(id));
          expect(BigNumber.from(await deployedOrigination.origin(id)).shl(160)).to.be.equal(
            calculatedOriginUint256(id),
          );
        }
      });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
