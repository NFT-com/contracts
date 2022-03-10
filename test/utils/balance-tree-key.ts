import MerkleTree from "./merkle-tree";
import { BigNumber, utils } from "ethers";

export default class BalanceTree {
  private readonly tree: MerkleTree;
  constructor(balances: { profileUrl: string; tokenId: BigNumber }[]) {
    this.tree = new MerkleTree(
      balances.map(({ profileUrl, tokenId }, index) => {
        return BalanceTree.toNode(index, tokenId, profileUrl);
      }),
    );
  }

  public static verifyProof(
    index: number | BigNumber,
    profileUrl: string,
    tokenId: BigNumber,
    proof: Buffer[],
    root: Buffer,
  ): boolean {
    let pair = BalanceTree.toNode(index, tokenId, profileUrl);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(abi.encode(index, tokenId, profileUrl))
  public static toNode(index: number | BigNumber, tokenId: BigNumber, profileUrl: string): Buffer {
    return Buffer.from(
      utils.solidityKeccak256(["uint256", "uint256", "string"], [index, tokenId, profileUrl]).substr(2),
      "hex",
    );
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getProof(index: number | BigNumber, tokenId: BigNumber, profileUrl: string): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, tokenId, profileUrl));
  }
}
