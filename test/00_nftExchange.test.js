const { expect } = require("chai");
const { BigNumber } = require("ethers");
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
  COLLECTION,
  CRYPTO_KITTY,
  getAssetHash,
  makeSalt,
  encode,
  MARKETPLACE_ORDER_TYPEHASH,
} = require("./utils/sign-utils");

// whole number
const convertNftToken = tokens => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

describe("NFT.com Marketplace", function () {
  try {
    let NftMarketplace,
      TransferProxy,
      CryptoKittyTransferProxy,
      ERC20TransferProxy,
      NftToken,
      NftProfile,
      NftStake,
      ERC1155Factory;
    let deployedNftMarketplace,
      deployedTransferProxy,
      deployedERC20TransferProxy,
      deployedNftToken,
      deployedNftProfile,
      deployedNftStake,
      deployedCryptoKittyTransferProxy,
      deployedXEENUS,
      deployedERC1155Factory;
    let ownerSigner, buyerSigner;

    const NFT_RINKEBY_ADDRESS = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";
    const NFT_PROFILE_RINKEBY = "0xb1D65B1a259bEA89a5A790db9a4Be5B2FFF97319";
    const RINKEBY_WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
    const RINEKBY_XEENUS = "0x022E292b44B5a146F2e8ee36Ff44D3dd863C915c";
    const ZERO_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      NftMarketplace = await ethers.getContractFactory("NftMarketplace");

      NftStake = await ethers.getContractFactory("PublicNftStake");
      TransferProxy = await ethers.getContractFactory("TransferProxy");
      ERC20TransferProxy = await ethers.getContractFactory("ERC20TransferProxy");
      CryptoKittyTransferProxy = await ethers.getContractFactory("CryptoKittyTransferProxy");
      ERC1155Factory = await ethers.getContractFactory("TestERC1155");

      deployedXEENUS = new ethers.Contract(
        RINEKBY_XEENUS,
        `[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"drip","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}]`,
        ethers.provider,
      );

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.attach(NFT_RINKEBY_ADDRESS);

      NftProfile = await ethers.getContractFactory("NftProfileV1");
      deployedNftProfile = await NftProfile.attach(NFT_PROFILE_RINKEBY);

      deployedERC1155Factory = await ERC1155Factory.deploy();

      [owner, buyer, addr2, ...addrs] = await ethers.getSigners();
      ownerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
      buyerSigner = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, "m/44'/60'/0'/0/1");

      deployedNftStake = await NftStake.deploy(deployedNftToken.address, RINKEBY_WETH);

      deployedTransferProxy = await upgrades.deployProxy(TransferProxy, { kind: "uups" });
      deployedERC20TransferProxy = await upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
      deployedCryptoKittyTransferProxy = await upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });

      deployedNftMarketplace = await upgrades.deployProxy(
        NftMarketplace,
        [
          deployedTransferProxy.address,
          deployedERC20TransferProxy.address,
          deployedCryptoKittyTransferProxy.address,
          deployedNftStake.address,
        ],
        { kind: "uups" },
      );

      await deployedNftMarketplace.setTransferProxy(ERC20_ASSET_CLASS, deployedERC20TransferProxy.address);

      // add operator being the marketplace
      await deployedTransferProxy.addOperator(deployedNftMarketplace.address);
      await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
      await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);
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

        await deployedTransferProxy.addOperator(owner.address);
        await deployedTransferProxy.removeOperator(owner.address);

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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          9999999999,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          0,
          3,
          ethers.provider,
          deployedNftMarketplace.address,
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        // send 1000 tokens to buyer
        await deployedNftToken
          .connect(owner)
          .transfer(buyer.address, BigNumber.from(1000).mul(BigNumber.from(10).pow(BigNumber.from(18))));

        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);

        await expect(deployedNftMarketplace.connect(buyer).buyNow(sellOrder, v0, r0, s0))
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyer.address, ownerSigner.address, convertNftToken(100));

        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftToken.balanceOf(buyer.address)).to.be.equal(
          BigNumber.from(8975).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );
        expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(
          BigNumber.from(25).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]]],
          owner.address,
          [[ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // send 1000 tokens to buyerSigner
        await deployedNftToken.connect(owner).transfer(buyerSigner.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);

        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);

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

        // revert due to sellOrder being used already
        await deployedNftMarketplace.cancel(sellOrder);

        // false because sellOrder already executed and cancelled
        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v1, r1, s1)).to.be.false;

        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyerSigner.address);
        expect(await deployedNftToken.balanceOf(deployedNftStake.address)).to.be.equal(
          BigNumber.from(125).mul(BigNumber.from(10).pow(BigNumber.from(17))),
        );

        // reverts due to > 2000
        await expect(deployedNftMarketplace.connect(owner).changeProtocolFee(2001)).to.be.reverted;

        await deployedNftMarketplace.connect(owner).changeProtocolFee(250);

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
      });

      it("should allow multi-asset swaps", async function () {
        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]]],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should allow more complicated multi-asset swaps", async function () {
        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should allow more mixed multi-asset swaps (ERC20 + 721) <=> (721 + ERC20 + ETH)", async function () {
        // transfer profile back to buyer for this exchange
        await deployedNftProfile.connect(owner).transferFrom(owner.address, buyer.address, 1);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]],
          ],
          ethers.constants.AddressZero,
          [
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 1], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(owner).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(buyer).approve(deployedTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(buyer.address);

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedXEENUS.balanceOf(buyer.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(500)),
        );

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
      });

      it("should allow optional assets and arbitrary tokenIds for NFTs", async function () {
        // transfer both profiles to buyer
        await deployedNftProfile.connect(owner).transferFrom(owner.address, buyer.address, 1);
        await deployedNftProfile.connect(owner).transferFrom(owner.address, buyer.address, 0);
        await deployedNftToken.connect(owner).transfer(buyer.address, convertNftToken(1000));

        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values, false means tokenId agnostic
              [1, 1], // data to be encoded
            ],
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]], // send tokenid 1 bc agnostic
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
          ],
          owner.address,
          [[ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), 0]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(owner).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(buyer).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(buyer).approve(deployedTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(buyer.address);

        // swap
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]),
        )
          .to.emit(deployedNftToken, "Transfer")
          .withArgs(buyerSigner.address, ownerSigner.address, convertNftToken(500));

        // balances after
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);
        expect(await deployedXEENUS.balanceOf(buyer.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(500)),
        );

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedXEENUS.connect(buyer).transfer(owner.address, convertNftToken(500));
      });

      it("should allow valid eth swaps", async function () {
        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(2), convertNftToken(1)]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 0], // data to be encoded
            ],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          ethers.constants.AddressZero,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(500), convertNftToken(50)]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), convertNftToken(1)]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(
          await deployedNftMarketplace.validateOrder_(incorrect_sellOrder, incorrect_v2, incorrect_r2, incorrect_s2),
        ).to.be.true;

        const {
          v: incorrect_v3,
          r: incorrect_r3,
          s: incorrect_s3,
          order: incorrect_buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(
          await deployedNftMarketplace.validateOrder_(incorrect_buyOrder, incorrect_v3, incorrect_r3, incorrect_s3),
        ).to.be.true;

        // should revert because eth is used twice
        await expect(deployedNftMarketplace.validateMatch_(incorrect_sellOrder, incorrect_buyOrder)).to.be.reverted;

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);

        // should revert because only buyer can call and send in msg.value
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        ).to.be.reverted;

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
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        // buyer should have sent 2 ETH, and received 1 ETH back
        expect(await ethers.provider.getBalance(deployedNftStake.address)).to.be.equal(
          convertNftToken(1).mul(250).div(10000),
        );
        // contract should have 0 ETH
        expect(await ethers.provider.getBalance(deployedNftMarketplace.address)).to.be.equal(0);
        // owner should have received 1 ETH
        expect(await ethers.provider.getBalance(owner.address)).to.be.equal(beforeEthBalance.add(convertNftToken(1)));

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 1);
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

        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
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
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]],
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
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [
            [ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(500), 0]],
            [ERC20_ASSET_CLASS, ["address"], [RINEKBY_XEENUS], [convertNftToken(250), 0]],
            [ETH_ASSET_CLASS, ["address"], [ethers.constants.AddressZero], [convertNftToken(1), 0]],
            [ERC1155_ASSET_CLASS, ["address", "uint256", "bool"], [deployedERC1155Factory.address, 0, false], [80, 0]],
          ],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
            [CRYPTO_KITTY, ["address", "uint256", "bool"], [deployedKittyCore.address, 1, true], [1, 0]],
            [ERC1155_ASSET_CLASS, ["address", "uint256", "bool"], [deployedERC1155Factory.address, 1, true], [150, 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedXEENUS.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 1);

        // approve 1155
        await deployedERC1155Factory.connect(owner).setApprovalForAll(deployedTransferProxy.address, true);
        await deployedERC1155Factory.connect(buyer).setApprovalForAll(deployedTransferProxy.address, true);

        // approve crypto kitty to be transfer
        await deployedKittyCore.connect(owner).approve(deployedCryptoKittyTransferProxy.address, 1);

        // match is valid
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.true;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);
        await deployedXEENUS.connect(owner).transfer(buyer.address, convertNftToken(500));
        const beforeXeenusBalance = await deployedXEENUS.balanceOf(owner.address);

        // should revert because only buyer can call and send in msg.value
        await expect(
          deployedNftMarketplace.connect(owner).executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1], {
            value: BigNumber.from("2000000000000000000"),
          }),
        ).to.be.reverted;

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
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(buyer.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(buyer.address);
        expect(await deployedXEENUS.balanceOf(owner.address)).to.be.equal(
          beforeXeenusBalance.add(convertNftToken(250)),
        );

        // buyer should have sent 2 ETH, and received 1 ETH back
        expect(await ethers.provider.getBalance(deployedNftStake.address)).to.be.equal(
          convertNftToken(1).mul(250).div(10000),
        );
        // contract should have 0 ETH
        expect(await ethers.provider.getBalance(deployedNftMarketplace.address)).to.be.equal(0);
        // owner should have received 1 ETH
        expect(await ethers.provider.getBalance(owner.address)).to.be.equal(beforeEthBalance.add(convertNftToken(1)));

        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 0);
        await deployedNftProfile.connect(buyer).transferFrom(buyer.address, owner.address, 1);
      });

      it("should not allow swaps with insufficient nft token", async function () {
        await deployedNftMarketplace.modifyWhitelist(NFT_RINKEBY_ADDRESS, true);
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
              [NFT_PROFILE_RINKEBY, 0, true], // values
              [1, 0], // data to be encoded
            ],
            [
              ERC721_ASSET_CLASS, // asset class
              ["address", "uint256", "bool"], // types
              [NFT_PROFILE_RINKEBY, 1, true], // values
              [1, 0], // data to be encoded
            ],
          ],
          ethers.constants.AddressZero,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(100), convertNftToken(10)]]],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(sellOrder, v0, r0, s0)).to.be.true;

        const {
          v: v1,
          r: r1,
          s: s1,
          order: buyOrder,
        } = await signMarketplaceOrder(
          buyerSigner,
          [[ERC20_ASSET_CLASS, ["address"], [NFT_RINKEBY_ADDRESS], [convertNftToken(9), 0]]],
          owner.address,
          [
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 0, true], [1, 0]],
            [ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [NFT_PROFILE_RINKEBY, 1, true], [1, 0]],
          ],
          0,
          0,
          ethers.provider,
          deployedNftMarketplace.address,
        );

        expect(await deployedNftMarketplace.validateOrder_(buyOrder, v1, r1, s1)).to.be.true;

        // add approvals
        await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 0);
        await deployedNftProfile.connect(owner).approve(deployedTransferProxy.address, 1);

        // match is invalid since NFT token bid doesn't meet minimum desired
        expect(await deployedNftMarketplace.validateMatch_(sellOrder, buyOrder)).to.be.false;

        // balances before
        expect(await deployedNftProfile.ownerOf(0)).to.be.equal(owner.address);
        expect(await deployedNftProfile.ownerOf(1)).to.be.equal(owner.address);

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
