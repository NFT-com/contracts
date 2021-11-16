function AssetType(assetClass: string, data: string) {
  return { assetClass, data };
}

function Asset(assetClass: string, assetData: string, value: number) {
  return { assetType: AssetType(assetClass, assetData), value };
}

function Order(
  maker: string,
  makeAsset: any,
  taker: string,
  takeAsset: any,
  salt: string,
  start: number,
  end: number,
  data: string,
) {
  return { maker, makeAsset, taker, takeAsset, salt, start, end, data };
}

const Types: any = {
  AssetType: [
    { name: "assetClass", type: "bytes4" },
    { name: "data", type: "bytes" },
  ],
  Asset: [
    { name: "assetType", type: "AssetType" },
    { name: "value", type: "uint256" },
  ],
  Order: [
    { name: "maker", type: "address" },
    { name: "makeAsset", type: "Asset" },
    { name: "taker", type: "address" },
    { name: "takeAsset", type: "Asset" },
    { name: "salt", type: "uint256" },
    { name: "start", type: "uint256" },
    { name: "end", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
};

module.exports = { AssetType, Asset, Order, Types };
