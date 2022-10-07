import { Provider } from "@ethersproject/providers";
import { Addresses, addressesByNetwork, generateMakerOrderTypedData, MakerOrder } from "@looksrare/sdk";
import axios from "axios";
import { BigNumber, BigNumberish } from "ethers";

import { IExecutionStrategy, RoyaltyFeeRegistry } from "../../../typechain/looksrare";
import { RoyaltyFeeRegistry__factory } from "../../../typechain/looksrare/factories/RoyaltyFeeRegistry__factory";
import { IExecutionStrategy__factory } from "../../../typechain/looksrare/factories/IExecutionStrategy__factory";
import { signLooksrareOrder } from "../sign-utils";

export const isNullOrEmpty = (val: string | any[] | null | undefined): boolean => val == null || val.length === 0;

export async function getLooksrareAddresses(chainId: number): Promise<any> {
  // @ts-ignore
  const addresses: Addresses = addressesByNetwork[chainId];
  return addresses;
}

export async function createLooksrareParametersForNFTListing(
  offerer: string,
  contractAddress: string,
  tokenId: string,
  price: BigNumberish,
  currency: string,
  chainId: number,
  nonce: number,
  looksrareStrategy: IExecutionStrategy,
  looksrareRoyaltyFeeRegistry: RoyaltyFeeRegistry,
  duration: BigNumberish,
): Promise<MakerOrder> {
  // @ts-ignore
  const addresses: Addresses = addressesByNetwork[chainId];
  const protocolFees = await looksrareStrategy.viewProtocolFee();
  const [
    ,
    ,
    // setter
    // receiver
    fee,
  ]: [string, string, BigNumber] = await looksrareRoyaltyFeeRegistry.royaltyFeeInfoCollection(contractAddress);

  // Get protocolFees and creatorFees from the contracts
  const netPriceRatio = BigNumber.from(10000).sub(protocolFees.add(fee)).toNumber();
  // This variable is used to enforce a max slippage of 25% on all orders, if a collection change the fees to be >25%, the order will become invalid
  const minNetPriceRatio = 7500;
  return {
    nonce: BigNumber.from(nonce).toString(),
    tokenId: BigNumber.from(tokenId).toString(),
    collection: contractAddress,
    strategy: addresses?.STRATEGY_STANDARD_SALE,
    currency: currency,
    signer: offerer,
    isOrderAsk: true,
    amount: "1",
    price: BigNumber.from(price).toString(),
    startTime: BigNumber.from(Date.now()).div(1000).sub(duration).toString(),
    endTime: BigNumber.from(Date.now()).div(1000).add(duration).toString(),
    minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
    params: [],
  };
}

export async function getLooksrareNonce(address: string, chainId: number): Promise<number> {
  const url = `https://${
    chainId == 5 ? "api-goerli" : "api"
  }.looksrare.org/api/v1/orders/nonce?address=${address}`;
  const { data } = await axios.get(url);
  return data?.data;
}

export function useLooksrareRoyaltyFeeRegistryContractContract(
  chainId: number,
  provider: Provider,
): RoyaltyFeeRegistry | null {
  // @ts-ignore
  const addresses: Addresses = addressesByNetwork[chainId];
  const address = addresses?.ROYALTY_FEE_REGISTRY;
  if (isNullOrEmpty(address)) {
    return null;
  }
  return RoyaltyFeeRegistry__factory.connect(address, provider);
}

export function useLooksrareStrategyContract(chainId: number, provider: Provider): IExecutionStrategy | null {
  // @ts-ignore
  const addresses: Addresses = addressesByNetwork[chainId];
  const address = addresses?.STRATEGY_STANDARD_SALE;
  if (isNullOrEmpty(address)) {
    return null;
  }
  // todo: generalize this hook to different strategies.
  return IExecutionStrategy__factory.connect(address, provider);
}

export async function signOrderForLooksrare(
  chainId: number,
  signer: any,
  order: MakerOrder,
): Promise<{ v: string; r: string; s: string } | undefined> {
  try {
    const { domain, value, type } = generateMakerOrderTypedData(signer.address, chainId, order);
    const signature = await signLooksrareOrder(
      signer,
      // @ts-ignore
      domain.name,
      domain.chainId,
      domain.version,
      domain.verifyingContract,
      type,
      value,
    );

    return signature;
  } catch (err) {
    console.log("error in signOrderForLooksrare: ", err);
  }
}
