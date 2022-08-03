import axios from "axios";
import { ethers } from "ethers";
import looksrareABI from "../../../looksrareABI.json";

const looksrare = new ethers.utils.Interface(looksrareABI);
const seaportLib = new ethers.utils.Interface(
  `[{"inputs":[],"name":"InputLengthMiconstsmatch","type":"error"},{"inputs":[],"name":"OPENSEA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"components":[{"components":[{"internalType":"address","name":"offerer","type":"address"},{"internalType":"address","name":"zone","type":"address"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"}],"internalType":"struct OfferItem[]","name":"offer","type":"tuple[]"},{"components":[{"internalType":"enum ItemType","name":"itemType","type":"uint8"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"identifierOrCriteria","type":"uint256"},{"internalType":"uint256","name":"startAmount","type":"uint256"},{"internalType":"uint256","name":"endAmount","type":"uint256"},{"internalType":"address payable","name":"recipient","type":"address"}],"internalType":"struct ConsiderationItem[]","name":"consideration","type":"tuple[]"},{"internalType":"enum OrderType","name":"orderType","type":"uint8"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bytes32","name":"zoneHash","type":"bytes32"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes32","name":"conduitKey","type":"bytes32"},{"internalType":"uint256","name":"totalOriginalConsiderationItems","type":"uint256"}],"internalType":"struct OrderParameters","name":"parameters","type":"tuple"},{"internalType":"uint120","name":"numerator","type":"uint120"},{"internalType":"uint120","name":"denominator","type":"uint120"},{"internalType":"bytes","name":"signature","type":"bytes"},{"internalType":"bytes","name":"extraData","type":"bytes"}],"internalType":"struct AdvancedOrder[]","name":"advancedOrders","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"enum Side","name":"side","type":"uint8"},{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"identifier","type":"uint256"},{"internalType":"bytes32[]","name":"criteriaProof","type":"bytes32[]"}],"internalType":"struct CriteriaResolver[]","name":"criteriaResolvers","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"offerFulfillments","type":"tuple[][]"},{"components":[{"internalType":"uint256","name":"orderIndex","type":"uint256"},{"internalType":"uint256","name":"itemIndex","type":"uint256"}],"internalType":"struct FulfillmentComponent[][]","name":"considerationFulfillments","type":"tuple[][]"},{"internalType":"bytes32","name":"fulfillerConduitKey","type":"bytes32"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"maximumFulfilled","type":"uint256"}],"internalType":"struct SeaportLib1_1.SeaportBuyOrder[]","name":"openSeaBuys","type":"tuple[]"},{"internalType":"uint256[]","name":"msgValue","type":"uint256[]"},{"internalType":"bool","name":"revertIfTrxFails","type":"bool"}],"name":"fulfillAvailableAdvancedOrders","outputs":[],"stateMutability":"nonpayable","type":"function"}]`,
);
const looksrareLib = new ethers.utils.Interface(
  `[{"inputs":[],"name":"InvalidChain","type":"error"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"tradeData","type":"bytes"},{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bool","name":"revertTxFail","type":"bool"}],"name":"_tradeHelper","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]`,
);

interface CombinedOrders {
  totalValue: ethers.BigNumber;
  combinedOrders: Array<AggregatorResponse>;
}

interface LooksrareInput {
  contractAddress: string;
  tokenId: string;
  msgValue: string;
  executorAddress: string;
  chainID: string;
  failIfRevert: boolean;
}
interface SeaportInput {
  contractAddress: string;
  tokenId: string;
  msgValue: string;
  recipient: string;
  chainID: string;
  failIfRevert: boolean;
}

interface AggregatorResponse {
  tradeData: string;
  value: ethers.BigNumber;
  marketId: string;
}

const libraryCall = (fnSig: string, entireHex: string): string => {
  return `${ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fnSig)).toString("hex").substring(0, 10)}` + entireHex;
};

const getLooksrarePrefix = (chainID: string) => {
  switch (Number(chainID)) {
    case 1:
      return "api";
    case 4:
      return "api-rinkeby";
    case 5:
      return "api-goerli";
    default:
      throw `chainID ${chainID} not supported`;
  }
};

const getSeaportPrefix = (chainID: string) => {
  switch (Number(chainID)) {
    case 1:
      return "api";
    case 4:
      return "testnets-api";
    case 5: // TODO: fill in when opensea supports goerli
    default:
      throw `chainID ${chainID} not supported`;
  }
};

const getLooksrareOrder = async (
  isOrderAsk = true,
  contract: string,
  tokenId: string,
  chainID: string,
  status = "VALID",
) => {
  try {
    const baseUrl = `https://${getLooksrarePrefix(chainID)}.looksrare.org/api/v1`;
    const url = `${baseUrl}/orders?isOrderAsk=${isOrderAsk}&collection=${contract}&status%5B%5D=${status}&tokenId=${tokenId}&sort=PRICE_ASC`;
    const config = {
      headers: { Accept: "application/json" },
    };
    return (await axios.get(url, config)).data;
  } catch (err) {
    console.log("error with looksrare order:", err);
    return err;
  }
};

const getSeaportOrder = async (
  contract: string,
  tokenId: string,
  chainID: string,
  limit = 1,
  OPENSEA_API_KEY = "2829e29e1ae34375a3cc5f4eee84e190",
) => {
  try {
    const baseUrl = `https://${getSeaportPrefix(chainID)}.opensea.io/v2`;
    const url = `${baseUrl}/orders/rinkeby/seaport/listings?asset_contract_address=${contract}&token_ids=${tokenId}&limit=${limit}`;
    const config = {
      headers:
        Number(chainID) == 1
          ? { Accept: "application/json", "X-API-KEY": OPENSEA_API_KEY }
          : { Accept: "application/json" },
    };
    return (await axios.get(url, config)).data;
  } catch (err) {
    console.log("error with looksrare order:", err);
    return err;
  }
};

const getSeaportHex = async (
  contractAddress: string,
  tokenID: string,
  msgValue: string,
  recipient: string,
  chainID: string,
  failIfRevert: boolean,
): Promise<AggregatorResponse> => {
  try {
    let zone;
    if (Number(chainID) == 1) {
      zone = "0x004c00500000ad104d7dbd00e3ae0a5c00560c00";
    } else if (Number(chainID) == 4) {
      zone = "0x00000000e88fe2628ebc5da81d2b3cead633e89e";
    } else {
      throw `chainID ${chainID} not supported`;
    }

    const data = await getSeaportOrder(contractAddress, tokenID, chainID, 5);
    const order = data?.orders[0];

    const orderStruct = [
      [
        [
          {
            denominator: "1",
            numerator: "1",
            parameters: {
              conduitKey: order.protocol_data.parameters.conduitKey,
              consideration: order.protocol_data.parameters.consideration,
              endTime: order.protocol_data.parameters.endTime,
              offer: order.protocol_data.parameters.offer,
              offerer: order.protocol_data.parameters.offerer, // seller
              orderType: order.protocol_data.parameters.orderType,
              salt: order.protocol_data.parameters.salt,
              startTime: order.protocol_data.parameters.startTime,
              totalOriginalConsiderationItems: order.protocol_data.parameters.totalOriginalConsiderationItems,
              zone: zone, // opensea pausable zone
              zoneHash: order.protocol_data.parameters.zoneHash,
            },
            signature: order.protocol_data.signature,
            extraData: "0x",
          },
        ],
        [],
        [
          [
            {
              orderIndex: "0",
              itemIndex: "0",
            },
          ],
        ],
        [
          [
            {
              orderIndex: "0",
              itemIndex: "0",
            },
          ],
          [
            {
              orderIndex: "0",
              itemIndex: "1",
            },
          ],
          [
            {
              orderIndex: "0",
              itemIndex: "2",
            },
          ],
        ],
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        recipient,
        "1",
      ],
    ];

    // input data for SeaportLibV1_1
    const inputData = [orderStruct, [msgValue], failIfRevert];
    const wholeHex = await seaportLib.encodeFunctionData("fulfillAvailableAdvancedOrders", inputData);
    const genHex = await libraryCall(
      "fulfillAvailableAdvancedOrders(SeaportLib1_1.SeaportBuyOrder[],uint256[],bool)",
      wholeHex.slice(10),
    );

    return {
      tradeData: genHex,
      value: ethers.BigNumber.from(msgValue),
      marketId: "3",
    };
  } catch (err) {
    throw `error in getSeaportHex: ${err}`;
  }
};

const getLooksrareHex = async (
  contractAddress: string,
  tokenID: string,
  chainID: string,
  msgValue: string,
  executorAddress: string,
  failIfRevert: boolean,
): Promise<AggregatorResponse> => {
  try {
    const data = await getLooksrareOrder(true, contractAddress, tokenID, chainID);

    const {
      hash,
      collectionAddress,
      tokenId,
      isOrderAsk,
      signer,
      strategy,
      currencyAddress,
      amount,
      price,
      nonce,
      startTime,
      endTime,
      minPercentageToAsk,
      params,
      status,
      signature,
      v,
      r,
      s,
    } = data.data[0];

    const hexParam = await looksrare.encodeFunctionData("matchAskWithTakerBidUsingETHAndWETH", [
      {
        isOrderAsk: false,
        taker: executorAddress,
        price,
        tokenId,
        minPercentageToAsk,
        params: params || "0x",
      },
      {
        isOrderAsk,
        signer,
        collection: collectionAddress,
        price,
        tokenId,
        amount,
        strategy,
        currency: currencyAddress,
        nonce,
        startTime,
        endTime,
        minPercentageToAsk,
        params: params || "0x",
        v,
        r,
        s,
      },
    ]);

    const wholeHex = await looksrareLib.encodeFunctionData("_tradeHelper", [
      msgValue,
      hexParam,
      contractAddress,
      tokenID,
      failIfRevert,
    ]);

    const genHex = await libraryCall("_tradeHelper(uint256,bytes,address,uint256,bool)", wholeHex.slice(10));

    return {
      tradeData: genHex,
      value: ethers.BigNumber.from(msgValue),
      marketId: "0",
    };
  } catch (err) {
    throw `error in getLooksrareHex: ${err}`;
  }
};

export const combineOrders = async (
  seaportOrders: Array<SeaportInput>,
  looksrareOrders: Array<LooksrareInput>,
): Promise<CombinedOrders> => {
  const seaportHexes = seaportOrders.map(
    async (i: SeaportInput) =>
      await getSeaportHex(i.contractAddress, i.tokenId, i.msgValue, i.recipient, i.chainID, i.failIfRevert),
  );

  const looksrareHexes = looksrareOrders.map(
    async (i: LooksrareInput) =>
      await getLooksrareHex(i.contractAddress, i.tokenId, i.chainID, i.msgValue, i.executorAddress, i.failIfRevert),
  );

  const totalValue: ethers.BigNumber = seaportOrders
    .map(i => ethers.BigNumber.from(i.msgValue))
    .concat(looksrareOrders.map(i => ethers.BigNumber.from(i.msgValue)))
    .reduce(
      (partialSum: ethers.BigNumber, a: ethers.BigNumber) => ethers.BigNumber.from(partialSum).add(a),
      ethers.BigNumber.from(0),
    );

  return {
    combinedOrders: await Promise.all(seaportHexes.concat(looksrareHexes)),
    totalValue,
  };
};
