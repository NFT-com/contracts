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

export const BID_TYPEHASH = convertToHash("Bid(uint256 _nftTokens,string _profileURI,address _owner)");

export const EXCHANGE_ORDER_TYPEHASH = convertToHash(
  "Order(address maker,Asset makeAsset,address taker,Asset takeAsset,uint256 salt,uint256 start,uint256 end,bytes data)Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)",
);

export const ASSET_TYPE_TYPEHASH = convertToHash("AssetType(bytes4 assetClass,bytes data)");

export const ASSET_TYPEHASH = convertToHash(
  "Asset(AssetType assetType,uint256 value)AssetType(bytes4 assetClass,bytes data)",
);

export const makeSalt = (length: number = 16): BigNumber => {
  return BigNumber.from(Math.floor(10 ** length + Math.random() * 9 * 10 ** length).toString());
};

export const ETH_ASSET_CLASS = convertToHash("ETH").substring(0, 10);
export const ERC20_ASSET_CLASS = convertToHash("ERC20").substring(0, 10);
export const ERC721_ASSET_CLASS = convertToHash("ERC721").substring(0, 10);
export const ERC1155_ASSET_CLASS = convertToHash("ERC1155").substring(0, 10);
export const COLLECTION = convertToHash("COLLECTION").substring(0, 10);
export const CRYPTO_PUNK = convertToHash("CRYPTO_PUNK").substring(0, 10);
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

export const getAssetHash = async (assetClass: string, data: string, value: number): Promise<string> => {
  const assetTypeHash = getHash(["bytes32", "bytes4", "bytes32"], [ASSET_TYPE_TYPEHASH, assetClass, data]);

  return getHash(["bytes32", "bytes32", "uint256"], [ASSET_TYPEHASH, assetTypeHash, value]);
};

// simply function to abstract the signing of marketplace orders on testing
// returns back signed digest
export const signMarketplaceOrder = async (
  signer: any,
  makeAsset: any,
  taker: string,
  takeAsset: any,
  start: number,
  end: number,
  minimumBidValue: number,
  provider: any,
  deployedNftMarketplaceAddress: string,
): Promise<any> => {
  const salt = makeSalt();

  const makeAssetHash = await getAssetHash(
    makeAsset[0],
    getHash(makeAsset[1], makeAsset[2]), // bytes encoding of contract
    makeAsset[3],
  );

  const takeAssetHash = await getAssetHash(
    takeAsset[0],
    getHash(takeAsset[1], takeAsset[2]), // bytes encoding of contract
    takeAsset[3],
  );

  // domain separator V4
  const orderDigest = await getDigest(
    provider,
    "NFT.com Marketplace",
    deployedNftMarketplaceAddress,
    getHash(
      ["bytes32", "address", "bytes32", "address", "bytes32", "uint256", "uint256", "uint256", "bytes32"],
      [
        EXCHANGE_ORDER_TYPEHASH,
        signer.address,
        makeAssetHash,
        taker,
        takeAssetHash,
        salt,
        start,
        end,
        getHash(["uint256"], [minimumBidValue]),
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
      {
        assetType: {
          assetClass: makeAsset[0],
          data: encode(makeAsset[1], makeAsset[2]),
        },
        value: makeAsset[3],
      },
      taker,
      {
        assetType: {
          assetClass: takeAsset[0],
          data: encode(takeAsset[1], takeAsset[2]),
        },
        value: takeAsset[3],
      },
      salt,
      start,
      end,
      encode(["uint256"], [minimumBidValue]),
    ],
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
