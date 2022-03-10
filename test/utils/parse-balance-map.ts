import { BigNumber, utils } from "ethers";
import BalanceTree from "./balance-tree";
import BalanceTreeKey from "./balance-tree-key";

const { isAddress, getAddress } = utils;

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
interface MerkleDistributorInfo {
  merkleRoot: string;
  tokenTotal: string;
  claims: {
    [account: string]: {
      index: number;
      amount: string;
      proof: string[];
      flags?: {
        [flag: string]: boolean;
      };
    };
  };
}

interface MerkleDistributorKeyInfo {
  merkleRoot: string;
  tokenTotal: string;
  claims: {
    [profileUrl: string]: {
      index: number;
      tokenId: string;
      proof: string[];
      flags?: {
        [flag: string]: boolean;
      };
    };
  };
}

type OldFormat = { [account: string]: number | string };
type NewFormat = { address: string; earnings: string; reasons: string };

export function parseBalanceMap(balances: OldFormat | NewFormat[]): MerkleDistributorInfo {
  // if balances are in an old format, process them
  const balancesInNewFormat: NewFormat[] = Array.isArray(balances)
    ? balances
    : Object.keys(balances).map(
        (account): NewFormat => ({
          address: account,
          earnings: `0x${balances[account].toString(16)}`,
          reasons: "",
        }),
      );

  const dataByAddress = balancesInNewFormat.reduce<{
    [address: string]: { amount: BigNumber; flags?: { [flag: string]: boolean } };
  }>((memo, { address: account, earnings, reasons }) => {
    if (!isAddress(account)) {
      throw new Error(`Found invalid address: ${account}`);
    }
    const parsed = getAddress(account);
    if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`);
    const parsedNum = BigNumber.from(earnings);
    if (parsedNum.lte(0)) throw new Error(`Invalid amount for account: ${account}`);

    const flags = {
      isSOCKS: reasons.includes("socks"),
      isLP: reasons.includes("lp"),
      isUser: reasons.includes("user"),
    };

    memo[parsed] = { amount: parsedNum, ...(reasons === "" ? {} : { flags }) };
    return memo;
  }, {});

  const sortedAddresses = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map(address => ({ account: address, amount: dataByAddress[address].amount })),
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: { amount: string; index: number; proof: string[]; flags?: { [flag: string]: boolean } };
  }>((memo, address, index) => {
    const { amount, flags } = dataByAddress[address];
    memo[address] = {
      index,
      amount: amount.toHexString(),
      proof: tree.getProof(index, address, amount),
      ...(flags ? { flags } : {}),
    };
    return memo;
  }, {});

  const tokenTotal: BigNumber = sortedAddresses.reduce<BigNumber>(
    (memo, key) => memo.add(dataByAddress[key].amount),
    BigNumber.from(0),
  );

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: tokenTotal.toHexString(),
    claims,
  };
}

export function parseBalanceMapKey(balances: OldFormat | NewFormat[]): MerkleDistributorKeyInfo {
  // if balances are in an old format, process them
  const balancesInNewFormat: NewFormat[] = Array.isArray(balances)
    ? balances
    : Object.keys(balances).map(
        (account): NewFormat => ({
          address: account,
          earnings: `0x${balances[account].toString(16)}`,
          reasons: "",
        }),
      );

  const dataByAddress = balancesInNewFormat.reduce<{
    [address: string]: { tokenId: BigNumber; flags?: { [flag: string]: boolean } };
  }>((memo, { address: account, earnings, reasons }) => {
    const parsed = account?.toLowerCase();
    if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`);
    const parsedNum = BigNumber.from(earnings);
    if (parsedNum.lt(0)) throw new Error(`Invalid tokenId for account: ${account}`);

    const flags = {
      isSOCKS: reasons.includes("socks"),
      isLP: reasons.includes("lp"),
      isUser: reasons.includes("user"),
    };

    memo[parsed] = { tokenId: parsedNum, ...(reasons === "" ? {} : { flags }) };
    return memo;
  }, {});

  const sortedProfileUrls = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTreeKey(
    sortedProfileUrls.map(profileUrl => ({ profileUrl, tokenId: dataByAddress[profileUrl].tokenId })),
  );

  // generate claims
  const claims = sortedProfileUrls.reduce<{
    [profileUrl: string]: { tokenId: string; index: number; proof: string[]; flags?: { [flag: string]: boolean } };
  }>((memo, profileUrl, index) => {
    const { tokenId, flags } = dataByAddress[profileUrl];
    memo[profileUrl] = {
      index,
      tokenId: tokenId.toHexString(),
      proof: tree.getProof(index, tokenId, profileUrl),
      ...(flags ? { flags } : {}),
    };
    return memo;
  }, {});

  const tokenTotal: BigNumber = sortedProfileUrls.reduce<BigNumber>(
    (memo, key) => memo.add(dataByAddress[key].tokenId),
    BigNumber.from(0),
  );

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: tokenTotal.toHexString(),
    claims,
  };
}
