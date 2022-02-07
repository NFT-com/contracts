const { ethers } = require("ethers");

const opensea = "0x495f947276749ce646f68ac8c248420045cb7b5e";
const erc1155ABI = `[
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_tokenId",
          "type": "uint256"
        }
      ],
      "name": "uri",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
          {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
          }
      ],
      "name": "maxSupply",
      "outputs": [
          {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "openSeaVersion",
      "outputs": [
          {
          "internalType": "string",
          "name": "",
          "type": "string"
          }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "creator",
      "outputs": [
          {
          "internalType": "address",
          "name": "",
          "type": "address"
          }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]`;

const mainnetChainId = 1;
const provider = ethers.getDefaultProvider(mainnetChainId, {
  infura: "cc4f8267b2cb45e1bdb62b3402bb10d8",
});

const openseaContract = new ethers.Contract(opensea, erc1155ABI, provider);

openseaContract
  .creator("85439735993382124668751690732986760340636919666515172646697212360011148166120")
  .then(e => {
    console.log("result: ", e);
  })
  .catch(err => console.log("error: ", err));
