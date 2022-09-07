import { BigNumber } from "ethers";

export type Maybe<T> = T | null;
export const SEAPORT_CONTRACT_NAME = "Seaport";
export const SEAPORT_CONTRACT_VERSION = "1.1";
export const OPENSEA_CONDUIT_KEY = "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000";
export const OPENSEA_CONDUIT_ADDRESS = "0x1e0049783f008a0085193e00003d00cd54003c71";
export const MAX_INT = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
export const ONE_HUNDRED_PERCENT_BP = 10000;
export const NO_CONDUIT = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Supply here any known conduit keys as well as their conduits
export const KNOWN_CONDUIT_KEYS_TO_CONDUIT = {
  [OPENSEA_CONDUIT_KEY]: OPENSEA_CONDUIT_ADDRESS,
};

export const CROSS_CHAIN_SEAPORT_ADDRESS = "0x00000000006c3852cbef3e08e8df289169ede581";
export const SEAPORT_ZONE = "0x004c00500000ad104d7dbd00e3ae0a5c00560c00";
export const SEAPORT_ZONE_RINKEBY = "0x00000000e88fe2628ebc5da81d2b3cead633e89e";
export const SEAPORT_ZONE_GOERLI = "0x0000000000000000000000000000000000000000";
export const SEAPORT_ZONE_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const SEAPORT_FEE_COLLLECTION_ADDRESS = "0x8De9C5A032463C561423387a9648c5C7BCC5BC90";
export const SEAPORT_FEE_COLLLECTION_ADDRESS_RINKEBY = "0x0000a26b00c1F0DF003000390027140000fAa719";

export enum OrderType {
  FULL_OPEN = 0, // No partial fills, anyone can execute
  PARTIAL_OPEN = 1, // Partial fills supported, anyone can execute
  FULL_RESTRICTED = 2, // No partial fills, only offerer or zone can execute
  PARTIAL_RESTRICTED = 3, // Partial fills supported, only offerer or zone can execute
}

export enum ItemType {
  NATIVE = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
  ERC721_WITH_CRITERIA = 4,
  ERC1155_WITH_CRITERIA = 5,
}

export enum Side {
  OFFER = 0,
  CONSIDERATION = 1,
}

export type NftItemType =
  | ItemType.ERC721
  | ItemType.ERC1155
  | ItemType.ERC721_WITH_CRITERIA
  | ItemType.ERC1155_WITH_CRITERIA;

export enum BasicOrderRouteType {
  ETH_TO_ERC721,
  ETH_TO_ERC1155,
  ERC20_TO_ERC721,
  ERC20_TO_ERC1155,
  ERC721_TO_ERC20,
  ERC1155_TO_ERC20,
}

export const EIP_712_ORDER_TYPE = {
  OrderComponents: [
    { name: "offerer", type: "address" },
    { name: "zone", type: "address" },
    { name: "offer", type: "OfferItem[]" },
    { name: "consideration", type: "ConsiderationItem[]" },
    { name: "orderType", type: "uint8" },
    { name: "startTime", type: "uint256" },
    { name: "endTime", type: "uint256" },
    { name: "zoneHash", type: "bytes32" },
    { name: "salt", type: "uint256" },
    { name: "conduitKey", type: "bytes32" },
    { name: "counter", type: "uint256" },
  ],
  OfferItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
  ],
  ConsiderationItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
    { name: "recipient", type: "address" },
  ],
};

export type SeaportOrderParameters = {
  offerer: string;
  zone: string;
  orderType: OrderType;
  startTime: string; // BigNumber
  endTime: string; // BigNumber
  zoneHash: string;
  salt: string;
  offer: SeaportOfferItem[];
  consideration: SeaportConsiderationItem[];
  totalOriginalConsiderationItems: string; // BigNumber
  conduitKey: string;
};

export type SeaportOrderComponents = SeaportOrderParameters & { counter: string /* BigNumber */ };

export interface SeaportOfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string; // BigNumber / uint256
  startAmount: string; // BigNumber / uint256
  endAmount: string; // BigNumber / uint256
}

export interface SeaportConsiderationItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string; // BigNumber / uint256
  startAmount: string; // BigNumber / uint256
  endAmount: string; // BigNumber / uint256
  recipient: string;
}

export type Fee = {
  recipient: string;
  basisPoints: number;
};
