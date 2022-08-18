import { IExecutionStrategy, RoyaltyFeeRegistry } from '../../../typechain/looksrare';

import { Addresses, addressesByNetwork, MakerOrder } from '@looksrare/sdk';
import { BigNumber, BigNumberish } from 'ethers';

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
  // takerAddress: string,
): Promise<MakerOrder> {
  // @ts-ignore
  const addresses: Addresses = addressesByNetwork[chainId];
  const protocolFees = await looksrareStrategy.viewProtocolFee();
  const [
    , // setter
    , // receiver
    fee
  ]: [string, string, BigNumber] = await looksrareRoyaltyFeeRegistry.royaltyFeeInfoCollection(contractAddress);

  // Get protocolFees and creatorFees from the contracts
  const netPriceRatio = BigNumber.from(10000).sub(protocolFees.add(fee)).toNumber();
  // This variable is used to enforce a max slippage of 25% on all orders, if a collection change the fees to be >25%, the order will become invalid
  const minNetPriceRatio = 7500;
  return {
    nonce,
    tokenId: BigNumber.from(tokenId).toString(),
    collection: contractAddress,
    strategy: addresses?.STRATEGY_STANDARD_SALE,
    currency: currency,
    signer: offerer,
    isOrderAsk: true,
    amount: '1',
    price:  BigNumber.from(price).toString(),
    startTime: BigNumber.from(Date.now()).div(1000).toString(),
    endTime: BigNumber.from(Date.now()).div(1000).add(duration).toString(),
    minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
    params: []
  };
}

// export async function signLooksrare(): string {
//   let nonce = 0;
//   const order: MakerOrder = await createLooksrareParametersForNFTListing(
//     currentAddress, // offerer
//     listing.nft,
//     listing.startingPrice,
//     listing.currency,
//     chain?.id,
//     nonce,
//     looksrareStrategy,
//     looksrareRoyaltyFeeRegistry,
//     listing.duration,
//     // listing.takerAddress
//   );
//   nonce++;
//   const signature = await signOrderForLooksrare(order);
// }