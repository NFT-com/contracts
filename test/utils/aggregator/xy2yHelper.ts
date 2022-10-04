import {
  X2Y2Order,
  TokenPair,
  data1155ParamType,
  data721ParamType,
  TokenStandard,
  Network,
  NetworkMeta,
  INTENT_SELL,
  DELEGATION_TYPE_ERC1155,
  DELEGATION_TYPE_ERC721
} from "./types";

import { BigNumber, ethers } from "ethers";
import { _TypedDataEncoder } from "ethers/lib/utils";
import { GenesisKey__factory } from "../../../typechain/factories/GenesisKey__factory";
import { ERC1155__factory } from "../../../typechain/factories/ERC1155__factory";

const orderItemParamType = `tuple(uint256 price, bytes data)`
const orderParamTypes = [
  `uint256`,
  `address`,
  `uint256`,
  `uint256`,
  `uint256`,
  `uint256`,
  `address`,
  `bytes`,
  `uint256`,
  `${orderItemParamType}[]`,
]

const getNetworkMeta = (network: Network): NetworkMeta => {
  switch (network) {
    case 'mainnet':
      return {
        id: 1,
        rpcUrl: 'https://rpc.ankr.com/eth',
        marketContract: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3',
        erc721DelegateContract: '0xf849de01b080adc3a814fabe1e2087475cf2e354',
        erc1155DelegateContract: '0x024ac22acdb367a3ae52a3d94ac6649fdc1f0779',
        wethContract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        apiBaseURL: 'https://api.x2y2.org',
      }
  }
}

function encodeItemData(data: TokenPair[]): string {
  if (data[0]?.tokenStandard === 'erc1155') {
    return ethers.utils.defaultAbiCoder.encode([data1155ParamType], [data])
  } else {
    return ethers.utils.defaultAbiCoder.encode([data721ParamType], [data])
  }
}


function fixSignature<T extends { v: number }>(data: T) {
  // in geth its always 27/28, in ganache its 0/1. Change to 27/28 to prevent
  // signature malleability if version is 0/1
  // see https://github.com/ethereum/go-ethereum/blob/v1.8.23/internal/ethapi/api.go#L465
  if (data.v < 27) {
    data.v = data.v + 27
  }
}

async function signOrder(
  signer: ethers.Signer,
  order: X2Y2Order
): Promise<void> {
  const orderData: string = ethers.utils.defaultAbiCoder.encode(
    orderParamTypes,
    [
      order.salt,
      order.user,
      order.network,
      order.intent,
      order.delegateType,
      order.deadline,
      order.currency,
      order.dataMask,
      order.items.length,
      order.items,
    ]
  )
  const orderHash = ethers.utils.keccak256(orderData)
  // signMessage
  const orderSig = await signer.signMessage(ethers.utils.arrayify(orderHash))
  order.r = `0x${orderSig.slice(2, 66)}`
  order.s = `0x${orderSig.slice(66, 130)}`
  order.v = parseInt(orderSig.slice(130, 132), 16)
  fixSignature(order)
}

function randomSalt(): string {
  const randomHex = BigNumber.from(ethers.utils.randomBytes(16)).toHexString()
  return ethers.utils.hexZeroPad(randomHex, 64)
}

function makeSellOrder(
  network: Network,
  user: string,
  expirationTime: number,
  items: { price: string; data: string }[],
  tokenStandard: TokenStandard | undefined
) {
  if (expirationTime < Math.round(Date.now() / 1000) + 900) {
    throw new Error('The expiration time has to be 15 minutes later.')
  }
  const salt = randomSalt()
  return {
    salt,
    user,
    network: getNetworkMeta(network).id,
    intent: INTENT_SELL,
    delegateType:
      tokenStandard === 'erc1155'
        ? DELEGATION_TYPE_ERC1155
        : DELEGATION_TYPE_ERC721,
    deadline: expirationTime,
    currency: ethers.constants.AddressZero,
    dataMask: '0x',
    items,
    r: '',
    s: '',
    v: 0,
    signVersion: 1,
  }
}

export async function signOrderForX2Y2(
  signer: ethers.Signer,
  order: X2Y2Order
): Promise<void> {
  await signOrder(signer, order)
}

const input = {
  'input': {
    'orders': [
      {
        'salt': '330301253372159475838719893497397244662',
        'user': '0x3beff89067d985a08fca612cfb3ccd4986314ed9',
        'network': '1',
        'intent': '1',
        'delegateType': '1',
        'deadline': '1671914511',
        'currency': '0x0000000000000000000000000000000000000000',
        'dataMask': '0x',
        'items': [
          {
            'price': '15000000000000000',
            'data': '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000406243ca557c259712be750773177bc714e49f6000000000000000000000000000000000000000000000000000000000000155d'
          }
        ],
        'r': '0xfded63691a42b760ceef8510da27bee9f19353c5428e5bb7e9c36881383885d0',
        's': '0x76391d86ae9744ba458d13704b8bc735dbe28eff95cd4627fc06647dc359be50',
        'v': 27,
        'signVersion': 1
      }
    ],
    'details': [
      {
        'op': 1,
        'orderIdx': '0',
        'itemIdx': '0',
        'price': '15000000000000000',
        'itemHash': '0xd951cf61c8a89d239fb31876175695123ea9a798481a633a32173b4a287bea18',
        'executionDelegate': '0xf849de01b080adc3a814fabe1e2087475cf2e354',
        'dataReplacement': '0x',
        'bidIncentivePct': '0',
        'aucMinIncrementPct': '0',
        'aucIncDurationSecs': '0',
        'fees': [
          {
            'percentage': '5000',
            'to': '0xd823c605807cc5e6bd6fc0d7e4eea50d3e2d66cd'
          },
          {
            'percentage': '100000',
            'to': '0x80cfd0322554eb3cb263fd29559828440f957582'
          }
        ]
      }
    ],
    'shared': {
      'salt': '243807992699659',
      'deadline': '1664905515',
      'amountToEth': '0',
      'amountToWeth': '0',
      'user': '0x487f09bd7554e66f131e24edc1efee0e0dfa7fd1',
      'canFail': false
    },
    'r': '0x57f844abfdb3f3e8172ed61e2fa593f11b359902709f3334eea97ab85d921a26',
    's': '0x5f18ada7732af6e8fa13074260f92c4c3ac62f09ea0b1748a73a05da88586475',
    'v': 28
  }
}

export async function createX2Y2ParametersForNFTListing(
  network: Network,
  signer: ethers.Signer,
  tokenAddress: string,
  tokenId: string,
  tokenStandard: TokenStandard,
  price: string,
  expirationTime: number,
): Promise<X2Y2Order> {
  const accountAddress = await signer.getAddress()

  const networkMeta = getNetworkMeta(network)
  const delegateContract =
    tokenStandard === 'erc1155'
      ? networkMeta.erc1155DelegateContract
      : networkMeta.erc721DelegateContract
  const contract =
    tokenStandard === 'erc1155'
      ? ERC1155__factory.connect(tokenAddress, signer)
      : GenesisKey__factory.connect(tokenAddress, signer) // 721 mock
  const approved = await contract.isApprovedForAll(
    accountAddress,
    delegateContract
  )
  if (!approved) {
    throw new Error('The NFT has not been approved yet.')
  }

  const data = encodeItemData([
    {
      token: tokenAddress,
      tokenId,
      amount: 1,
      tokenStandard: tokenStandard ?? 'erc721',
    },
  ])
  const order: X2Y2Order = makeSellOrder(
    network,
    accountAddress,
    expirationTime,
    [{ price, data }],
    tokenStandard
  )

  await signOrderForX2Y2(signer, order);

  return order;
}