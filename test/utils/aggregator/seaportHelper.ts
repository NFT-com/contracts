import {
  CROSS_CHAIN_SEAPORT_ADDRESS,
  EIP_712_ORDER_TYPE,
  Fee,
  ItemType,
  ONE_HUNDRED_PERCENT_BP,
  OPENSEA_CONDUIT_KEY,
  OrderType,
  SEAPORT_CONTRACT_NAME,
  SEAPORT_CONTRACT_VERSION,
  SEAPORT_FEE_COLLLECTION_ADDRESS,
  SEAPORT_FEE_COLLLECTION_ADDRESS_2,
  SEAPORT_ZONE,
  SEAPORT_ZONE_HASH,
  SEAPORT_ZONE_GOERLI,
  SeaportConsiderationItem,
  SeaportOrderComponents,
  SeaportOrderParameters,
  Maybe,
  Domain
} from "./types";

import { BigNumber, BigNumberish, ethers } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { Seaport__factory } from "../../../typechain/seaport/factories/Seaport__factory";

export const NULL_ADDRESS = ethers.utils.getAddress("0x0000000000000000000000000000000000000000");

// @ts-ignore
export const filterNulls = <T>(items: Maybe<T>[]): T[] => items.filter(item => item != null);

export function getTypedDataDomain(chainId: string | number): Domain {
  return {
    name: SEAPORT_CONTRACT_NAME,
    version: SEAPORT_CONTRACT_VERSION,
    chainId,
    verifyingContract: CROSS_CHAIN_SEAPORT_ADDRESS,
  };
}

export function getMessageToSign(orderParameters: SeaportOrderComponents, chainId: string | number): string {
  return JSON.stringify(_TypedDataEncoder.getPayload(getTypedDataDomain(chainId), EIP_712_ORDER_TYPE, orderParameters));
}

export const generateRandomSalt: () => string = () => {
  return `0x${Buffer.from(ethers.utils.randomBytes(16)).toString("hex")}`;
};

export const multiplyBasisPoints = (amount: BigNumberish, basisPoints: BigNumberish): BigNumber =>
  BigNumber.from(amount).mul(BigNumber.from(basisPoints)).div(ONE_HUNDRED_PERCENT_BP);

export const isCurrencyItem = ({ itemType }: SeaportConsiderationItem): boolean =>
  [ItemType.NATIVE, ItemType.ERC20].includes(itemType);

export function deductFees(considerationItems: SeaportConsiderationItem[], fees: Fee[]): any {
  const totalBasisPoints = fees.reduce((accBasisPoints, fee) => accBasisPoints + fee.basisPoints, 0);
  return considerationItems.map(item => ({
    ...item,
    startAmount: isCurrencyItem(item)
      ? BigNumber.from(item.startAmount).sub(multiplyBasisPoints(item.startAmount, totalBasisPoints)).toString()
      : item.startAmount,
    endAmount: isCurrencyItem(item)
      ? BigNumber.from(item.endAmount).sub(multiplyBasisPoints(item.endAmount, totalBasisPoints)).toString()
      : item.endAmount,
  }));
}

export const feeToConsiderationItem = ({
  fee,
  token,
  baseAmount,
  baseEndAmount = baseAmount,
}: {
  fee: Fee;
  token: string;
  baseAmount: BigNumberish;
  baseEndAmount?: BigNumberish;
}): SeaportConsiderationItem => {
  return {
    itemType: token === ethers.constants.AddressZero ? ItemType.NATIVE : ItemType.ERC20,
    token,
    identifierOrCriteria: "0",
    startAmount: multiplyBasisPoints(baseAmount, fee.basisPoints).toString(),
    endAmount: multiplyBasisPoints(baseEndAmount, fee.basisPoints).toString(),
    recipient: fee.recipient,
  };
};

export function createSeaportParametersForNFTListing(
  customZone = undefined,
  offerer: string,
  contractAddress: string,
  tokenId: string,
  startingPrice: BigNumberish,
  endingPrice: BigNumberish,
  currency: string,
  duration: BigNumberish,
  collectionFee: Maybe<Fee>,
  chainId: string,
): SeaportOrderParameters {
  // This is what the seller will accept for their NFT.
  // For now, we support a single currency.
  const considerationItems = [
    {
      itemType: currency === NULL_ADDRESS ? ItemType.NATIVE : ItemType.ERC20,
      token: currency,
      identifierOrCriteria: BigNumber.from(0).toString(),
      startAmount: BigNumber.from(startingPrice).toString(),
      endAmount: BigNumber.from(endingPrice ?? startingPrice).toString(),
      recipient: offerer,
    },
  ];
  const openseaFee: Fee = {
    recipient: chainId == "5" ? SEAPORT_FEE_COLLLECTION_ADDRESS_2 : SEAPORT_FEE_COLLLECTION_ADDRESS,
    basisPoints: 250,
  };

  const considerationItemsWithFees = filterNulls([
    ...deductFees(considerationItems, filterNulls([openseaFee, collectionFee])),
    feeToConsiderationItem({
      fee: openseaFee,
      token: currency,
      baseAmount: startingPrice,
      baseEndAmount: endingPrice ?? startingPrice,
    }),
    collectionFee != null
      ? feeToConsiderationItem({
          fee: collectionFee,
          token: currency,
          baseAmount: startingPrice,
          baseEndAmount: endingPrice ?? startingPrice,
        })
      : null,
  ]);
  return {
    offerer: offerer ?? NULL_ADDRESS,
    zone:
      chainId === "5"
        ? customZone || SEAPORT_ZONE_GOERLI
        : chainId === "1"
        ? SEAPORT_ZONE
        : customZone,
    offer: [
      {
        itemType: ItemType.ERC721,
        token: contractAddress,
        identifierOrCriteria: BigNumber.from(tokenId).toString(),
        startAmount: BigNumber.from(1).toString(),
        endAmount: BigNumber.from(1).toString(),
      },
    ],
    consideration: considerationItemsWithFees,
    orderType: OrderType.FULL_RESTRICTED,
    startTime: BigNumber.from(Date.now()).div(1000).sub(duration).toString(),
    endTime: BigNumber.from(Date.now()).div(1000).add(duration).toString(),
    zoneHash: SEAPORT_ZONE_HASH,
    totalOriginalConsiderationItems: String(considerationItemsWithFees.length),
    salt: generateRandomSalt(),
    conduitKey: OPENSEA_CONDUIT_KEY,
  };
}

export async function signOrderForOpensea(
  chainId: number,
  signer: ethers.Wallet,
  provider: any,
  orderParameters: SeaportOrderParameters,
): Promise<string | undefined> {
  try {
    const seaport = Seaport__factory.connect(CROSS_CHAIN_SEAPORT_ADDRESS, provider);
    const counter = (await seaport.getCounter(orderParameters.offerer))?.toString();

    const domain = getTypedDataDomain(chainId ?? 1);

    const type = EIP_712_ORDER_TYPE;
    const value = {
      ...orderParameters,
      counter,
    } as SeaportOrderComponents;

    const signature = await signer._signTypedData(domain, type, value);

    return signature;
  } catch (err) {
    console.log("error in signOrderForOpensea: ", err);
  }
}
