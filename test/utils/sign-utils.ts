import { BigNumber, ethers, BigNumberish, BytesLike } from "ethers";
import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, _TypedDataEncoder } from "ethers/lib/utils";
import { getChainId, RSV } from "./rpc";
import abi from "ethereumjs-abi";
import Web3 from "web3";

const web3 = new Web3();

export const MAX_UINT = BigNumber.from(2).pow(BigNumber.from(256)).sub(1);

export const AuctionType = {
  FixedPrice: 0,
  English: 1,
  Decreasing: 2,
};

export const convertNftToken = (tokens: string | number): BigNumber => {
  return BigNumber.from(`${tokens}`).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

export const convertSmallNftToken = (tokens: string | number): BigNumber => {
  return BigNumber.from(`${tokens}`).mul(BigNumber.from(10).pow(BigNumber.from(16)));
};

export const signHashPublicSale = (inputHash: string): any => {
  const hash = "0x" + abi.soliditySHA3(["string"], [inputHash + new Date().getTime().toString()]).toString("hex");

  const sigObj = web3.eth.accounts.sign(hash, process.env.PUBLIC_SALE_PK ?? "");

  return {
    hash: sigObj.messageHash,
    signature: sigObj.signature,
  };
};

export const signHashProfile = (address: string, profile: string): any => {
  const hash = "0x" + abi.soliditySHA3(["address", "string"], [address, profile.toLowerCase()]).toString("hex");

  const sigObj = web3.eth.accounts.sign(hash, process.env.PUBLIC_SALE_PK ?? "");

  return {
    hash: sigObj.messageHash,
    signature: sigObj.signature,
  };
};

export const sign = (digest: any, signer: ethers.Wallet): RSV => {
  return { ...signer._signingKey().signDigest(digest) };
};

export const convertToHash = (text: string) => {
  return keccak256(toUtf8Bytes(text));
};

// 0x40261ade532fa1d2c7293df30aaadb9b3c616fae525a0b56d3d411c841a85028
export const MAKER_ORDER_HASH = convertToHash(
  "MakerOrder(bool isOrderAsk,address signer,address collection,uint256 price,uint256 tokenId,uint256 amount,address strategy,address currency,uint256 nonce,uint256 startTime,uint256 endTime,uint256 minPercentageToAsk,bytes params)",
);

// TODO:
export const OPENSEA_TYPEHASH = convertToHash("");

export const ERC20_PERMIT_TYPEHASH = convertToHash(
  "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)",
);

export const GENESIS_KEY_TYPEHASH = convertToHash("GenesisBid(uint256 _wethTokens,address _owner)");

export const BID_TYPEHASH = convertToHash("Bid(uint256 _nftTokens,bool _genKey,string _profileURI,address _owner)");

export const MARKETPLACE_ORDER_TYPEHASH = convertToHash(
  "Order(address maker,Asset[] makeAssets,address taker,Asset[] takeAssets,uint256 salt,uint256 start,uint256 end,uint256 nonce,uint8 auctionType)Asset(AssetType assetType,bytes data)AssetType(bytes4 assetClass,bytes data)",
);

export const convertBigNumber = (tokens: number): BigNumberish => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(18)));
};

export const convertSmallNumber = (tokens: number): BigNumberish => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(17)));
};

export const convertTinyNumber = (tokens: number): BigNumberish => {
  return BigNumber.from(tokens).mul(BigNumber.from(10).pow(BigNumber.from(16)));
};

export const ASSET_TYPE_TYPEHASH = convertToHash("AssetType(bytes4 assetClass,bytes data)");

export const ASSET_TYPEHASH = convertToHash(
  "Asset(AssetType assetType,bytes data)AssetType(bytes4 assetClass,bytes data)",
);

export const makeSalt = (length: number = 16): BigNumber => {
  return BigNumber.from(Math.floor(10 ** length + Math.random() * 9 * 10 ** length).toString());
};

export const ETH_ASSET_CLASS = convertToHash("ETH").substring(0, 10);
export const ERC20_ASSET_CLASS = convertToHash("ERC20").substring(0, 10);
export const ERC721_ASSET_CLASS = convertToHash("ERC721").substring(0, 10);
export const ERC1155_ASSET_CLASS = convertToHash("ERC1155").substring(0, 10);
export const COLLECTION = convertToHash("COLLECTION").substring(0, 10);
export const CRYPTO_KITTY = convertToHash("CRYPTO_KITTY").substring(0, 10);
interface Domain {
  name: string;
  version: string;
  chainId: BigNumberish;
  verifyingContract: string;
  salt?: BytesLike;
}

const getDomain = async (provider: any, name: string, verifyingContract: string): Promise<Domain> => {
  const chainId = await getChainId(provider);

  return { name, version: "1", chainId, verifyingContract };
};

export const domainSeparator = async (
  provider: any,
  name: string, // name is deprecated
  contractAddress: string,
): Promise<string> => {
  const domain = await getDomain(provider, name, contractAddress);

  return _TypedDataEncoder.hashDomain(domain);
};

export const encode = (types: string[], values: any[]): string => {
  return defaultAbiCoder.encode(types, values);
};

export const getHash = (types: string[], values: any[]): string => {
  return keccak256(defaultAbiCoder.encode(types, values));
};

export const getAssetTypeHash = (assetClass: string, assetTypeData: string): string => {
  return getHash(["bytes32", "bytes4", "bytes32"], [ASSET_TYPE_TYPEHASH, assetClass, assetTypeData]);
};

export const getAssetHash = (asset: any): string => {
  return getHash(
    ["bytes32", "bytes32", "bytes32"],
    [
      ASSET_TYPEHASH,
      getAssetTypeHash(asset[0], getHash(asset[1], asset[2])),
      getHash(["uint256", "uint256"], asset[3]),
    ],
  );
};

export const getAssetHashes = (assets: any): string => {
  const assetList = [];
  const assetTypeList = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const assetTypeHash = getAssetHash(asset);

    assetList.push(assetTypeHash);
    assetTypeList.push("bytes32");
  }

  return getHash(assetTypeList, assetList);
};

const getAssetList = (assets: any) => {
  return assets.map((asset: any) => {
    return {
      assetType: {
        assetClass: asset[0],
        data: encode(asset[1], asset[2]),
      },
      data: encode(["uint256", "uint256"], asset[3]),
    };
  });
};

export const signLooksrareOrder = async (
  signer: any,
  domainName: string,
  domainChainId: number,
  domainVersion: string,
  domainVerifyingContract: string,
  types: any,
  values: any,
): Promise<any> => {
  try {
    const orderHash = getHash(
      ["bytes32"].concat(types.MakerOrder.map((a: any) => (a.type == "bytes" ? "bytes32" : a.type))),
      [MAKER_ORDER_HASH].concat(
        types.MakerOrder.map((a: any) => a.name).map((b: any) => (values[b] == "0x" ? keccak256("0x") : values[b])),
      ),
    );

    const orderDigest = await getExplicitDigest(
      domainName,
      domainChainId,
      domainVersion,
      domainVerifyingContract,
      orderHash,
    );

    const { v, r, s } = sign(orderDigest, signer);

    return {
      v,
      r,
      s,
    };
  } catch (err) {
    console.log("error in signLooksrareOrder: ", err);
  }
};

// simply function to abstract the signing of marketplace orders on testing
// returns back signed digest
export const signMarketplaceOrder = async (
  signer: any,
  makeAssets: any,
  taker: string,
  takeAssets: any,
  start: number,
  end: number,
  nonce: number,
  provider: any,
  deployedNftMarketplaceAddress: string,
  auctionType: number
): Promise<any> => {
  const salt = makeSalt();

  const makeAssetHash = getAssetHashes(makeAssets);

  const takeAssetHash = getAssetHashes(takeAssets);

  // domain separator V4
  const orderDigest = await getDigest(
    provider,
    "NFT.com Marketplace",
    deployedNftMarketplaceAddress,
    getHash(
      ["bytes32", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "uint256", "uint256", "uint8", "bool"],
      [
        MARKETPLACE_ORDER_TYPEHASH,
        signer.address,
        makeAssetHash,
        taker,
        takeAssetHash,
        salt,
        start,
        end,
        nonce,
        auctionType
      ],
    ),
  );

  const { v, r, s } = sign(orderDigest, signer);

  return {
    v,
    r,
    s,
    order: [
      signer.address,
      getAssetList(makeAssets),
      taker,
      getAssetList(takeAssets),
      salt,
      start,
      end,
      nonce,
      auctionType
    ],
  };
};

const getExplicitDomain = async (
  name: string,
  chainId: number,
  version: string,
  verifyingContract: string,
): Promise<Domain> => {
  return { name, version, chainId, verifyingContract };
};

export const explicitDomainSeparator = async (
  name: string, // name is deprecated
  chainId: number,
  version: string,
  contractAddress: string,
): Promise<string> => {
  const domain = await getExplicitDomain(name, chainId, version, contractAddress);

  return _TypedDataEncoder.hashDomain(domain);
};

export const getExplicitDigest = async (
  name: string,
  chainId: number,
  version: string,
  contractAddress: string,
  hash: BytesLike,
): Promise<string> => {
  return keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", await explicitDomainSeparator(name, chainId, version, contractAddress), hash],
    ),
  );
};

export const getDigest = async (
  provider: any,
  name: string, // name is deprecated
  contractAddress: string,
  hash: BytesLike,
): Promise<string> => {
  return keccak256(
    solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      ["0x19", "0x01", await domainSeparator(provider, name, contractAddress), hash],
    ),
  );
};
