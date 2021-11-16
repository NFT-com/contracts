const { keccak256, toUtf8Bytes } = require("ethers/lib/utils");
import { defaultAbiCoder } from "ethers/lib/utils";

function id(str: string) {
  return `0x${keccak256(toUtf8Bytes(str)).toString("hex").substring(0, 8)}`;
}

function enc(token: string, tokenId: number) {
  if (tokenId) {
    return defaultAbiCoder.encode(["address", "uint256"], [token, tokenId]);
  } else {
    return defaultAbiCoder.encode(["address"], [token]);
  }
}

const ETH = id("ETH");
const ERC20 = id("ERC20");
const ERC721 = id("ERC721");
const ERC721_LAZY = id("ERC721_LAZY");
const ERC1155 = id("ERC1155");
const ERC1155_LAZY = id("ERC1155_LAZY");
const COLLECTION = id("COLLECTION");
const CRYPTO_PUNK = id("CRYPTO_PUNK");
const ORDER_DATA_V1 = id("V1");
const TO_MAKER = id("TO_MAKER");
const TO_TAKER = id("TO_TAKER");
const PROTOCOL = id("PROTOCOL");
const ROYALTY = id("ROYALTY");
const ORIGIN = id("ORIGIN");
const PAYOUT = id("PAYOUT");

module.exports = {
  id,
  ETH,
  ERC20,
  ERC721,
  ERC721_LAZY,
  ERC1155,
  ERC1155_LAZY,
  ORDER_DATA_V1,
  TO_MAKER,
  TO_TAKER,
  PROTOCOL,
  ROYALTY,
  ORIGIN,
  PAYOUT,
  CRYPTO_PUNK,
  COLLECTION,
  enc,
};
