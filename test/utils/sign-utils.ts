import { BigNumber, ethers, BigNumberish, BytesLike } from "ethers";
import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, Bytes, _TypedDataEncoder } from "ethers/lib/utils";
import { getChainId, RSV, signData } from "./rpc";

export const sign = (digest: any, signer: ethers.Wallet): RSV => {
  return { ...signer._signingKey().signDigest(digest) };
};

export const convertToHash = (text: string) => {
  return keccak256(toUtf8Bytes(text));
};

export const ERC20_PERMIT_TYPEHASH = convertToHash(
  "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)",
);

export const GENESIS_KEY_TYPEHASH = convertToHash("GenesisBid(uint256 _wethTokens,address _owner)");

export const BID_TYPEHASH = convertToHash("Bid(uint256 _nftTokens,bool _genKey,string _profileURI,address _owner)");

export const MARKETPLACE_ORDER_TYPEHASH = convertToHash(
  "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,uint256 nonce)Asset(AssetType assetType,bytes data)AssetType(bytes4 assetClass,bytes data)",
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
  "Assets[](AssetType assetType,bytes data)AssetType(bytes4 assetClass,bytes data)",
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

export const getAssetTypeHash = async (assetClass: string, assetTypeData: string): Promise<string> => {
  return getHash(["bytes32", "bytes4", "bytes32"], [ASSET_TYPE_TYPEHASH, assetClass, assetTypeData]);
};

export const getAssetHash = async (assets: any): Promise<string> => {
  let data32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    const assetTypeHash = await getAssetTypeHash(asset[0], getHash(asset[1], asset[2]));

    data32 = getHash(
      ["bytes32", "bytes32", "bytes32"],
      [data32, assetTypeHash, getHash(["uint256", "uint256"], asset[3])],
    );
  }

  return getHash(["bytes32", "bytes32"], [ASSET_TYPEHASH, data32]);
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
): Promise<any> => {
  const salt = 1 || makeSalt();

  const makeAssetHash = await getAssetHash(makeAssets);

  const takeAssetHash = await getAssetHash(takeAssets);

  // domain separator V4
  const orderDigest = await getDigest(
    provider,
    "NFT.com Marketplace",
    deployedNftMarketplaceAddress,
    getHash(
      ["bytes32", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "uint256", "uint256"],
      [MARKETPLACE_ORDER_TYPEHASH, signer.address, makeAssetHash, taker, takeAssetHash, salt, start, end, nonce],
    ),
  );

  const { v, r, s } = sign(orderDigest, signer);

  return {
    v,
    r,
    s,
    order: [signer.address, getAssetList(makeAssets), taker, getAssetList(takeAssets), salt, start, end, nonce],
  };
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
