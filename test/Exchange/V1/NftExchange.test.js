const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { advanceBlock } = require("../../utils/time");
const {
  sign,
  getDigest,
  getHash,
  convertToHash,
  ERC20_PERMIT_TYPEHASH,
  ETH_ASSET_CLASS,
  ERC20_ASSET_CLASS,
  ERC721_ASSET_CLASS,
  ERC1155_ASSET_CLASS,
  COLLECTION,
  CRYPTO_PUNK,
  getAssetHash,
  makeSalt,
  encode,
  EXCHANGE_ORDER_TYPEHASH,
} = require("../../utils/sign-utils");

describe("NFT.com Exchange", function () {
  try {
    let NftExchange, TransferProxy, ERC20TransferProxy, NftToken, NftProfile;
    let deployedNftExchange, deployedTransferProxy, deployedERC20TransferProxy, deployedNftToken, deployedNftProfile;
    let ownerSigner;

    const NFT_RINKEBY_ADDRESS = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";
    const NFT_PROFILE_RINKEBY = "0xb1D65B1a259bEA89a5A790db9a4Be5B2FFF97319";
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const RINEKBY_XEENUS = "0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c";

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftExchange = await ethers.getContractFactory("NftExchange");
      TransferProxy = await ethers.getContractFactory("TransferProxy");
      ERC20TransferProxy = await ethers.getContractFactory("ERC20TransferProxy");

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.attach(NFT_RINKEBY_ADDRESS);

      NftProfile = await ethers.getContractFactory("NftProfileV1");
      deployedNftProfile = await NftProfile.attach(NFT_PROFILE_RINKEBY);

      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);

      deployedTransferProxy = await upgrades.deployProxy(TransferProxy, { kind: "uups" });

      deployedERC20TransferProxy = await upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });

      // console.log("deployedTransferProxy: ", deployedTransferProxy.address);
      // console.log("deployedERC20TransferProxy: ", deployedERC20TransferProxy.address);

      deployedNftExchange = await upgrades.deployProxy(
        NftExchange,
        [deployedTransferProxy.address, deployedERC20TransferProxy.address],
        { kind: "uups" },
      );

      // console.log("deployedNftExchange: ", deployedNftExchange.address);
    });

    describe("Initialize Exchange", function () {
      it("should encode VRS into bytes65 signature", async function () {
        const v = 28;
        const r = "0x8fbf2bcdc98d8ceea20e1c9e6c3237ff9d8536a813a7166a5a5ce4411eee9fb9";
        const s = "0x2a6cb9a6e2a74fd3b3689b14e004c8b6bb65a83f79ce617af2d4befbe26ac6ff";

        let sig = await deployedNftExchange.concatVRS(v, r, s);
        let decoded = await deployedNftExchange.recoverVRS(sig);

        expect(decoded[0]).to.be.equal(v);
        expect(decoded[1]).to.be.equal(r);
        expect(decoded[2]).to.be.equal(s);
      });
    });

    describe("Allow simple Swaps", function () {
      it("should allow EOA users to make valid bid orders using sigV4", async function () {
        let minimumBidValue = BigNumber.from(5).mul(BigNumber.from(10).pow(BigNumber.from(18)));  // 5 NFT tokens

        let maker = ownerSigner.address;

        let makeAsset = await getAssetHash(
          ERC721_ASSET_CLASS,
          getHash(["address", "uint256"], [NFT_PROFILE_RINKEBY, 0]),                               // bytes encoding of contract and token id
          1                                                                                       // 1 quantity of 721
        );

        let taker = ethers.constants.AddressZero;
        let takeAsset = await getAssetHash(
          ERC20_ASSET_CLASS,
          getHash(["address"], [NFT_RINKEBY_ADDRESS]),                                             // bytes encoding of contract
          BigNumber.from(100).mul(BigNumber.from(10).pow(BigNumber.from(18)))                     // 1 NFT token (buy it now)
        );

        let salt = makeSalt();
        let start = 0;
        let end = 0;
        let keccak256Data = getHash(["uint256"], [minimumBidValue]);
        let regularData = encode(["uint256"], [minimumBidValue]);

        // domain separator V4
        const exchangeOrderDigest = await getDigest(
          ethers.provider,
          "NFT.com Exchange",
          deployedNftExchange.address,
          getHash(
            ["bytes32", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "uint256", "bytes32"],
            [EXCHANGE_ORDER_TYPEHASH, maker, makeAsset, taker, takeAsset, salt, start, end, keccak256Data],
          ),
        );

        let { v: v0, r: r0, s: s0 } = sign(exchangeOrderDigest, ownerSigner);

        let buyOrder = [
          maker,
          {
            assetType: {
              assetClass: ERC721_ASSET_CLASS,
              data: encode(["address", "uint256"], [NFT_PROFILE_RINKEBY, 0]),
            },
            value: 1
          },
          taker,
          {
            assetType: {
              assetClass: ERC20_ASSET_CLASS,
              data: encode(["address"], [NFT_RINKEBY_ADDRESS]),
            },
            value: BigNumber.from(100).mul(BigNumber.from(10).pow(BigNumber.from(18)))
          },
          salt,
          start,
          end,
          regularData
        ];

        expect(await deployedNftExchange.validateOrder_(
          buyOrder,
          v0,
          r0,
          s0
        )).to.be.true;
      });
    });
  } catch (err) {
    console.log("NFT Exchange error: ", err);
  }
});
