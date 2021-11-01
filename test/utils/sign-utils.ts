import { ethers, BigNumberish, BytesLike } from "ethers";
import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, Bytes, _TypedDataEncoder } from "ethers/lib/utils";
import { getChainId, RSV, signData } from "./rpc";

export const sign = (digest: any, signer: ethers.Wallet): RSV => {
    return { ...signer._signingKey().signDigest(digest) };
};

export const convertToHash = (text: string) => {
    return keccak256(toUtf8Bytes(text));
};

export const ERC20_PERMIT_TYPEHASH = convertToHash(
    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
);

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
    contractAddress: string
): Promise<string> => {
    const domain = await getDomain(provider, contractAddress.toLowerCase(), contractAddress);
    return _TypedDataEncoder.hashDomain(domain);
};


export const getHash = (types: string[], values: any[]): string => {
    return keccak256(defaultAbiCoder.encode(types, values));
};

export const getDigest = async (
    provider: any,
    name: string,   // name is deprecated
    contractAddress: string,
    hash: BytesLike
): Promise<string> => {
    return keccak256(
        solidityPack(
            ["bytes1", "bytes1", "bytes32", "bytes32"],
            ["0x19", "0x01", await domainSeparator(provider, name, contractAddress), hash]
        )
    );
};