const ethers = require("ethers");
// const utils = ethers.utils;
// const inBytes = utils.formatBytes32String("0x674913D21D70a9e1Ace0B94662ef297170483237"); // tz3Zhs2dygr55yHyQyKjntAtY9bgfhLZ4Xj1
// console.log(inBytes);

const INFURA_KEY = "460ed70fa7394604a709b7dff23f1641";
const provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_KEY);

const looksrareABI = require("./looksrareABI.json");

const looksrare = new ethers.utils.Interface(looksrareABI);

(async () => {
  const tx = await provider.getTransaction("0x4b95396f48ae269a648603592c9575e850c818afdcc39813fd211c777989e3b3");
  const decodedInput = looksrare.parseTransaction({ data: tx.data, value: tx.value });

  // Decoded Transaction
  console.log({
    function_name: decodedInput.name,
    from: tx.from,
    decodedInput: decodedInput,
    // args: decodedInput.args,
    takerBid: {
      isOrderAsk: decodedInput.args.takerBid.isOrderAsk,
      taker: decodedInput.args.takerBid.taker,
      price: Number(decodedInput.args.takerBid.price),
      tokenId: Number(decodedInput.args.takerBid.tokenId),
      minPercentageToAsk: Number(decodedInput.args.takerBid.minPercentageToAsk),
      params: decodedInput.args.takerBid.params,
    },
    makerAsk: {
      isOrderAsk: decodedInput.args.makerAsk.isOrderAsk,
      signer: decodedInput.args.makerAsk.signer,
      collection: decodedInput.args.makerAsk.collection,
      price: Number(decodedInput.args.makerAsk.price),
      tokenId: Number(decodedInput.args.makerAsk.tokenId),
      amount: Number(decodedInput.args.makerAsk.amount),
      strategy: decodedInput.args.makerAsk.strategy,
      currency: decodedInput.args.makerAsk.currency,
      nonce: Number(decodedInput.args.makerAsk.nonce),
      startTime: Number(decodedInput.args.makerAsk.startTime),
      endTime: Number(decodedInput.args.makerAsk.endTime),
      minPercentageToAsk: Number(decodedInput.args.makerAsk.minPercentageToAsk),
      params: decodedInput.args.makerAsk.params,
      v: decodedInput.args.makerAsk.v,
      r: decodedInput.args.makerAsk.r,
      s: decodedInput.args.makerAsk.s,
    },
  });
})();
