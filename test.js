const ethers = require('ethers');
const seaportABI = require('./abis/seaport.json');

let seaport = new ethers.utils.Interface(seaportABI);

const testData = "0xed98a57400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000b800000000000000000000000000000000000000000000000000000000000000ca00000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000580000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000382c49191172ec45c1dd0091cbbf12677d90d9b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000633ecc76000000000000000000000000000000000000000000000000000000006367aaf60000000000000000000000000000000000000000000000000000000000000000360c6ebe0000000000000000000000000000000000000000f6fb94dbe60bb1810000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000019b28d18ce73948c42328a800e5c8491f4bd8cfc0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de5a6f8e00000000000000000000000000000000000000000000000000000000de5a6f8e00000000000000000000000000382c49191172ec45c1dd0091cbbf12677d90d9b200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005d21dba0000000000000000000000000000000000000000000000000000000005d21dba000000000000000000000000000000a26b00c1f0df003000390027140000faa71900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004a817c80000000000000000000000000000000000000000000000000000000004a817c8000000000000000000000000002634f02fc3a51845b0067b081c32341b642e830600000000000000000000000000000000000000000000000000000000000000414d3f9d64d6462136e562783b909727887e1dffa94eb5136f3ea3c92403786b443fa95db61041ad8801b251ee91f52baf1f2c021e698f4b17cb8290484de8be301b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000004c0000000000000000000000000382c49191172ec45c1dd0091cbbf12677d90d9b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000633ec9b8000000000000000000000000000000000000000000000000000000006367a8380000000000000000000000000000000000000000000000000000000000000000360c6ebe00000000000000000000000000000000000000003fcded77f27db9760000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000eadc529dc4efb14c9a369b4cab09b3c406f5089a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008af885b8c00000000000000000000000000000000000000000000000000000008af885b8c00000000000000000000000000382c49191172ec45c1dd0091cbbf12677d90d9b20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a352944000000000000000000000000000000000000000000000000000000003a352944000000000000000000000000000000a26b00c1f0df003000390027140000faa7190000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e90edd0000000000000000000000000000000000000000000000000000000002e90edd0000000000000000000000000002634f02fc3a51845b0067b081c32341b642e83060000000000000000000000000000000000000000000000000000000000000041df340ff9942e95633613bedebf2923d8b9d940f09a0e487af7f0becd5352999e3f833a4c924eae51ebd3a84c043714361dbaf0df2879f819e69dae14af3979901b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002360c6ebe";

try {  
  const decodedData = seaport.decodeFunctionData("", testData);
  console.log('decodedData: ', decodedData);
} catch (err) {
  console.log('decoded error: ', err);
}

// const processIPFSURL = (image) => {
//   const prefix = 'https://opensea.mypinata.cloud/ipfs/'
//   if (image == null) {
//     return null
//   } else if (image.indexOf('ipfs://ipfs/') === 0) {
//     return prefix + image.slice(12)
//   } else if (image.indexOf('ipfs://') === 0) {
//     return prefix + image.slice(7)
//   } else if (image.indexOf('https://ipfs.io/ipfs/') === 0) {
//     return prefix + image.slice(21)
//   } else if (image.indexOf('https://infura-ipfs.io/ipfs/') === 0) {
//     return prefix + image.slice(28)
//   } else if (image.indexOf('pinata.cloud/ipfs/') !== -1) {
//     const index = image.indexOf('pinata.cloud/ipfs/')
//     return prefix + image.slice(index + 18)
//   } else {
//     return image
//   }
// }

// console.log('1: ', processIPFSURL('https://ipfs.io/ipfs/QmbpPYYgbHKU7rYiz5Fd58nLCEEPGxyqH3WNA2WsFffv3a?filename=LooleeBear_471.png'))