import { task } from "hardhat/config";
import chalk from "chalk";
import csv from "csvtojson";
import fs from "fs";
import delay from "delay";
import { parseBalanceMap } from "../../test/utils/parse-balance-map";
import {
  ETH_ASSET_CLASS,
  signMarketplaceOrder,
  ERC20_ASSET_CLASS,
  ERC721_ASSET_CLASS,
  ERC1155_ASSET_CLASS,
  CRYPTO_KITTY,
  convertSmallNftToken,
  AuctionType,
  MAX_UINT,
} from "../../test/utils/sign-utils";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { combineOrders, LooksrareInput, SeaportCompleteInput } from "../../test/utils/aggregator/index";
import { getNetworkMeta } from "../../test/utils/aggregator/xy2yHelper";
import { chainIdToNetwork, networkType } from "../../hardhat.config";
import { contracts } from "../../constants";

const UNI_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const TIME_DELAY = 10000; // 10 seconds

const mainnetBool = (hre: any) => {
  const chainId = hre.network.config.chainId;
  return chainId === 1;
};

const getNetwork = (hre: any) => {
  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;
  return network;
};

const getTokens = async (hre: any) => {
  const chainId = hre.network.config.chainId;

  const network = chainIdToNetwork[chainId];

  return {
    governor: contracts.governor[network as keyof networkType] || "",
    wethAddress: contracts.wethAddress[network as keyof networkType] || "",
    usdcAddress: contracts.usdcAddress[network as keyof networkType] || "",
    deployedNftTokenAddress: contracts.deployedNftTokenAddress[network as keyof networkType] || "",
    deployedVestingAddress: contracts.deployedVestingAddress[network as keyof networkType] || "",
    deployedGenesisKeyAddress: contracts.deployedGenesisKeyAddress[network as keyof networkType] || "",
    genesisKeyTeamDistributorAddress: contracts.genesisKeyTeamDistributorAddress[network as keyof networkType] || "",
    profileMetadataLink: contracts.profileMetadataLink[network as keyof networkType] || "",
    deployedNftBuyer: contracts.deployedNftBuyer[network as keyof networkType] || "",
    ipfsHash: contracts.ipfsHash[network as keyof networkType] || "",
    deployedGenesisKeyTeamClaimAddress:
      contracts.deployedGenesisKeyTeamClaimAddress[network as keyof networkType] || "",
    multiSig: contracts.multiSig[network as keyof networkType] || "",
    deployedProfileAuction: contracts.deployedProfileAuction[network as keyof networkType] || "",
    deployedNftProfile: contracts.deployedNftProfile[network as keyof networkType] || "",
    deployedNftResolver: contracts.deployedNftResolver[network as keyof networkType] || "",
    deployedNftAggregator: contracts.deployedNftAggregator[network as keyof networkType] || "",
    deployedLooksrareLibV1: contracts.deployedLooksrareLibV1[network as keyof networkType] || "",
    deployedSeaportLib1_1: contracts.deployedSeaportLib1_1[network as keyof networkType] || "",
    deployedX2Y2Lib: contracts.deployedX2Y2Lib[network as keyof networkType] || "",
    deployedNativeNftTradingLib: contracts.deployedNativeNftTradingLib[network as keyof networkType] || "",
    deployedNftStake: contracts.deployedNftStake[network as keyof networkType] || "",
    deployedMarketplaceRegistry: contracts.deployedMarketplaceRegistry[network as keyof networkType] || "",
    deployedMarketplaceEvent: contracts.deployedMarketplaceEvent[network as keyof networkType] || "",
    deployedNftMarketplace: contracts.deployedNftMarketplace[network as keyof networkType] || "",
    deployedNftTransferProxy: contracts.deployedNftTransferProxy[network as keyof networkType] || "",
    deployedERC20TransferProxy: contracts.deployedERC20TransferProxy[network as keyof networkType] || "",
    deployedCryptoKittyTransferProxy: contracts.deployedCryptoKittyTransferProxy[network as keyof networkType] || "",
    deployedValidationLogic: contracts.deployedValidationLogic[network as keyof networkType] || "",
  };
};

const verifyContract = async (name: string, address: string, args: Array<string>, hre: any): Promise<void> => {
  try {
    console.log(chalk.green(`verifying ${name}`));
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (err) {
    console.log(chalk.red(`verification failed: ${err}`));
  }
};

const waitTx = async (name: string, object: any, hre: any): Promise<void> => {
  try {
    console.log(chalk.green(`waiting for ${name} tx`));
    await hre.ethers.provider.waitForTransaction(object.deployTransaction.hash, 1, 200000);
    console.log(chalk.green(`${name}: `, object.address));
  } catch (err) {
    console.log(chalk.red(`wait tx failed: ${err}`));
  }
};

const delayedVerifyImp = async (name: string, address: string, hre: any): Promise<void> => {
  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await getImplementation(name, address, hre);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getImplementation = async (name: string, proxyAddress: string, hre: any): Promise<string> => {
  try {
    const currentImplAddress = await getImplementationAddress(hre.ethers.provider, proxyAddress);

    await verifyContract(`${name} impl ${currentImplAddress}`, currentImplAddress, [], hre);

    return currentImplAddress;
  } catch (err) {
    console.log("error while getting implementation address:", err);
    return "error";
  }
};

// TASKS ============================================================
task("deploy:0").setAction(async function (taskArguments, hre) {
  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.deploy();
  console.log(chalk.green(`deployedNftToken: ${deployedNftToken.address}`));

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await verifyContract("deployedNftToken", deployedNftToken.address, [], hre);
});

task("deploy:0b").setAction(async function (taskArguments, hre) {
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const deployedVesting = await hre.upgrades.deployProxy(
    Vesting,
    [(await getTokens(hre)).deployedNftTokenAddress, (await getTokens(hre)).governor],
    {
      kind: "uups",
    },
  );
  console.log(chalk.green(`deployedVesting: ${deployedVesting.address}`));

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await getImplementation("deployedVesting", deployedVesting.address, hre);
});

task("init:deliver").setAction(async function (taskArguments, hre) {
  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.attach((await getTokens(hre)).deployedNftTokenAddress);

  try {
    const jsonCSV = await csv().fromFile("./randomVesting.csv");
    for (let i = 22; i < jsonCSV.length; i++) {
      const row = jsonCSV[i];
      const result = await deployedNftToken.teamTransfer([row.Address], [row.Amount]);
      const txHash = result.hash;
      console.log(row.Address, `https://etherscan.io/tx/${txHash}`);
    }
  } catch (err) {
    console.error(err);
  }
});

task("deploy:udo").setAction(async function (taskArguments, hre) {
  try {
    const baseURI = "ipfs://QmSqyfNBxHiHyvEuk23LKt2v7QDi3KivVLPsqhBJ7oxfRf/";
    const UdoDrop = await hre.ethers.getContractFactory("UdoDrop");
    const deployedUdo = await UdoDrop.deploy(baseURI);

    console.log(chalk.green(`deployedUdo: ${deployedUdo.address}`));

    await verifyContract("deployedUdo", deployedUdo.address, [baseURI], hre);
  } catch (err) {
    console.log("error: ", err);
  }
});

task("init:vest").setAction(async function (taskArguments, hre) {
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const deployedVesting = await Vesting.attach((await getTokens(hre)).deployedVestingAddress);

  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.attach((await getTokens(hre)).deployedNftTokenAddress);

  await deployedNftToken.approve(
    deployedVesting.address,
    hre.ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
  );

  try {
    // Address,Amount,Parsed Token,Begin,,Cliff,,End,,Installment
    const jsonCSV = await csv().fromFile("./vesting.csv");
    const address = jsonCSV.map((row) => row.Address);
    const amount = jsonCSV.map((row) =>
      hre.ethers.BigNumber.from(row.ParsedToken.replaceAll(",", "").replace(".00", "")).mul(
        hre.ethers.BigNumber.from(10).pow(18),
      ),
    );
    const vestingBegin = jsonCSV.map((row) => row.Begin);
    const vestingCliff = jsonCSV.map((row) => row.Cliff);
    const vestingEnd = jsonCSV.map((row) => row.End);
    const vestingInstallment = jsonCSV.map((row) => row.Installment);

    const result = await deployedVesting.initializeVesting(
      address,
      amount,
      vestingBegin,
      vestingCliff,
      vestingEnd,
      vestingInstallment,
    );

    console.log(`https://etherscan.io/tx/${result.hash}`);
  } catch (err) {
    console.error(err);
  }
});

// STEP 1 (deploy:GenesisKey)
task("deploy:1").setAction(async function (taskArguments, hre) {
  const name = "NFT.com Genesis Key";
  const symbol = "GENESISKEY";
  const auctionSeconds = "604800"; // seconds in 1 week
  const multiSig = (await getTokens(hre)).multiSig;
  const randomTeamAssignBool = true;

  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

  // Use old genesis key version (with auction flow)
  const GenesisKey = await hre.ethers.getContractFactory(network === "goerli" ? "GenesisKeyOld" : "GenesisKey");
  const deployedGenesisKey = await hre.upgrades.deployProxy(
    GenesisKey,
    [name, symbol, multiSig, auctionSeconds, randomTeamAssignBool, (await getTokens(hre)).ipfsHash],
    { kind: "uups" },
  );

  const GenesisKeyTeamClaim = await hre.ethers.getContractFactory("GenesisKeyTeamClaim");
  const deployedGenesisKeyTeamClaim = await hre.upgrades.deployProxy(
    GenesisKeyTeamClaim,
    [deployedGenesisKey.address],
    { kind: "uups" },
  );

  const GenesisKeyTeamDistributor = await hre.ethers.getContractFactory("GenesisKeyTeamDistributor");
  const deployedGkTeamDistributor = await GenesisKeyTeamDistributor.deploy(deployedGenesisKeyTeamClaim.address);

  await deployedGenesisKey.setGkTeamClaim(deployedGenesisKeyTeamClaim.address);

  // only set pause transfer until public sale is over
  if (!mainnetBool(hre)) {
    await deployedGenesisKey.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);
  }

  await deployedGenesisKey.setWhitelist(deployedGenesisKeyTeamClaim.address, true);
  await deployedGenesisKeyTeamClaim.setGenesisKeyMerkle(deployedGkTeamDistributor.address);

  console.log(chalk.green(`deployedGkTeamDistributor: ${deployedGkTeamDistributor.address}`));
  console.log(chalk.green(`deployedGenesisKeyTeamClaim: ${deployedGenesisKeyTeamClaim.address}`));
  console.log(chalk.green(`deployedGenesisKey: ${deployedGenesisKey.address}`));

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await verifyContract(
    "deployedGkTeamDistributor",
    deployedGkTeamDistributor.address,
    [deployedGenesisKeyTeamClaim.address],
    hre,
  );
  await getImplementation("deployedGenesisKey", deployedGenesisKey.address, hre);
  await getImplementation("deployedGenesisKeyTeamClaim", deployedGenesisKeyTeamClaim.address, hre);
});

// gen key whitelist claim INSIDER
task("deploy:1b").setAction(async function (taskArguments, hre) {
  // insider merkle tree ==============================================================================================
  const GenesisKeyTeamDistributor = await hre.ethers.getContractFactory("GenesisKeyTeamDistributor");
  const deployedGenesisKeyTeamDistributor = await GenesisKeyTeamDistributor.attach(
    (
      await getTokens(hre)
    ).genesisKeyTeamDistributorAddress,
  );

  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

  // INSIDER LIST FROM CORE.SERVICES
  const insiderGKClaimJSON_Mainnet = JSON.parse(`{
    "0xa06b01381c267318f2d65f05be343c7a2e224713": "1",
    "0xCDD6a63FeC8c5Dab5f10a139761aa5aCf729317E": "1",
    "0x9f0d3E5aA86c242DbAB469486Fa4C2Ec04974A9a": "1",
    "0x54D1F8745aB57c29d0Cec4877e75028Fe37689f1": "1",
    "0x615E4c654Ba4a81970d9c3Ff25A3F602bB384045": "1",
    "0x3D50F0ec1a0825365CF3E6BBA90a67C37D08B77f": "1",
    "0xEDbD2C0a9a813789ba6F2eD5427f6c0bb9D2e906": "1",
    "0x738dF6bFd711d04416dAA15B10E309Fdf5Dd5945": "1",
    "0xce6489bb151a73Fe82999443e8Ba6AF1571C28c9": "1",
    "0xa4e2367CF24a1AC4E06b4D94B9660730e6d35a25": "1",
    "0x89CA82624F453647ED6e9Ce5Ca5b25aB8F7f0Bf6": "1",
    "0x714610543F367F6c12390Fcfd40608DF4e9567C7": "1",
    "0x38a55929d4047aC9192De1bE35f9a957E4D03FA7": "1",
    "0xc2D558E4556B09519649749DC702D804E1F71FD4": "1",
    "0x2e50870053A015409269d9f9e26D3A6869887020": "1",
    "0x577C0eEDccEbF9E0eeD9F64962535C56692e9FC1": "1",
    "0xcDe8B26f837A77A22d95bA2701c68D3E96351287": "1",
    "0x1e75E1c7e430b9a6863B531cfe6b3820d82b42f8": "1",
    "0xF6c3c3621F42Ec1F1CD1207Bb1571d93646Ab29A": "1",
    "0x46E83273B865829CBE193642741ae46cC65463e0": "1",
    "0xd83B7Af20636b7e1A0d62b5600B5ABf8d49D4C96": "1",
    "0x2a2E938eC0b8E2bD534795dE09AE722b78f46a3e": "1",
    "0x8cb377959625E693986c6AdeF82fFF01d4d91aF8": "1",
    "0x916D113ca8FbF529ab2565B2D528eF979b8f8004": "1",
    "0xb56E74b28CFa1C4e4d30591227a02B5879155BAF": "1",
    "0xA593C8F83f8Ddaa378Fb9450B9dd29413069E420": "1",
    "0x3b883b85fd41b81ef23b6041248bc6ac0b1c04a7": "1",
    "0xB367697500a8C69439E9fC50908316C7a9E32DfA": "1",
    "0x491853781E02F974d6Fa18d8A2186bb4a4ca6977": "1",
    "0xadA2f10a38B513c550F08DC4C8FEAEa3909F1a1B": "1",
    "0x09726B46170FD47AC945912a6C0d69454f6445AA": "1",
    "0x3C312Db5bC3af511e20Dcc8b256Ca887dfa9BF1C": "1",
    "0x8952D923F4D957725F699603afD44Da6Bdc748A5": "1",
    "0x58d0f3da9c97de3c39f481e146f3568081d328a2": "1",
    "0xaC72e2fa06f52De2352F1548F00858E81C6d39C0": "1",
    "0xC9d4f1d9CAc71AE773dab932d01138f04Fc9e01f": "1",
    "0x5abd046d91d8610d1bd2bed6b4ca56dde1a23abf": "1",
    "0x6b0591697B8CFc114738B77F13dDDD2f013E2681": "1",
    "0x0448fb5d1E640eED801e7b98c26624834AaEb89b": "1",
    "0x7F8B5bdd5Cf38C425E93c54a9D8b924fD16a0a1F": "1",
    "0x6AC9e51CA18B78307Fe7DF2A01CD3b871F6348D0": "1",
    "0xC857283243E3367dA2c79e6127B25B8f96e276ff": "1",
    "0x7a3a08f41fa1a97e23783C04ff1095598ce0132c": "1",
    "0xF45B6966E588c5286D4397256B74bb9bfCf24296": "1",
    "0x321dF32c66A18D4e085705d50325040a7dC9d76A": "1",
    "0xdc36F82FC3C6331975fB20C74d01B378f1d0EB78": "1",
    "0x4a5978Ba7C240347280Cdfb5dfaFbb1E87d25af8": "1",
    "0x4c4c22c0C670607F5fd519d78c89925158f5Fe59": "1",
    "0xD26812Bb71b7455B4837461c5FbB9BACCF6E938C": "1",
    "0xC55f9f7F8662f7c0Da4643d1105D84Ad3Ac8dcF8": "1",
    "0x88fd66ee0Da6B621290070E3d4CaB71907DB02B6": "1",
    "0x56a9D77b41A80f0f499f56DFb8Cc2Bcf17c66CC8": "1",
    "0xE86a716D6D3C4B85bF4cdD5c1BDe24C9865e5eC4": "1",
    "0xbC828Cb03771DF942B79DaAF7d36266357A902f8": "1",
    "0x1BD05549fD62785fE6fF7a4f7c4678c6b7025964": "1",
    "0xDB10C51DdC6bCFced9Eb0e17D1020a006e9063BD": "1",
    "0xB83145BE4164C42A28800BCeB056a4A1e58d2844": "1",
    "0x4911e3049a846a2495c2474d45a4d578abdeaeab": "1",
    "0x67bF9c5a79C676A6D446cC391DB632704EB0f020": "1",
    "0x67Ff9934c797DD104F86F6FAcc7feF23D8a6f9e3": "1",
    "0xc5B746bDe254F5B88f4F906AafbD788EB282c760": "1",
    "0x9E3508a1dE57a459835a2DFDc451afa7677962DD": "1",
    "0x05AE0683d8B39D13950c053E70538f5810737bC5": "1",
    "0x3651c09BfAEccc9D03EB8f7181Ce58082377DA25": "1",
    "0x8dbbca57ea56290efa14d835bbfd34faf1d89753": "1",
    "0xe0ae80592e0be32f899a448fa927929530fcf2c5": "1",
    "0xaCCc711035b1D2EBE8B184d4798AcF434f549103": "1",
    "0xA25A8C2658E0b3a0649811A47Ed3bBfdcAB5Cf71": "1",
    "0x0088601C5F3E3D4ea452FBbC181Ed2d333a81460": "1",
    "0xA9Fe952EdD2958aB7Dea126c6d8B4413AfD3E771": "1",
    "0xf4615A18A0AC709D07d3EDc7a295fdAAfa6aBe1C": "1",
    "0xaa4629DfA35955FE83770c2e4c670152dbB25970": "1",
    "0xd5B94091505B8D578B154BE895D060fB1615ea84": "1",
    "0x12F37431468eb75c2a825e2Cf8Fde773aD94c8EA": "1",
    "0x6430B6b425657C3823683948638fe24431946efF": "1",
    "0xCd514eaE987A5A619e7F7EAf7D143fAAAe7fd289": "1",
    "0x7fEE3D50AE036F3E72071dDBa811F58472995Edc": "1",
    "0x731ce77e9940e346DDDED2De1219c0F910d1Ff1d": "1",
    "0xAe51b702Ee60279307437b13734D27078EF108AA": "1",
    "0x56a065dFEB4616f89aD733003914A8e11dB6CEdD": "1",
    "0xe5660Eb0fB9BBF7B7Aa9736f521099CDA3fB21D6": "1",
    "0xC345420194D9Bac1a4b8f698507Fda9ecB2E3005": "1",
    "0xFda1e9cd11BA632005838f48367fc9e38E2B8EFB": "1",
    "0x1e82eDe518Dad3e385cFC0AD52203911D254bc91": "1",
    "0x5c09f8b380140E40A4ADc744F9B199a9383553F9": "1",
    "0xAf68eFa7F52DF54C6888b53bD4AC66803Dc92A5b": "1",
    "0x78908a90A5e8AB9Fd0DbcA58E7aDE532Cf2c8667": "1",
    "0x7F04084166e1F2478B8f7a99FafBA4238c7dDA83": "1",
    "0xc97F36837e25C150a22A9a5FBDd2445366F11245": "1",
    "0x5b4245dC95831B0a10868aC09559b92cF36C8d8D": "1",
    "0x0d23B68cD7fBc3afA097f14ba047Ca2C1da64349": "1",
    "0xa18376780EB719bA2d2abb02D1c6e4B8689329e0": "1",
    "0xe95455414169FD5C89FAC460412a81A1daEe452e": "1",
    "0xb5AEddc7336a1aA2D18D6De315931972bEc2901B": "1",
    "0xfA3ccA6a31E30Bf9A0133a679d33357bb282c995": "1",
    "0x1Bd8814B90372cc92e7FE0785948c981618cAa78": "1",
    "0xe333681e63Ac0a4b063B0576DEC14dFf894bF8f0": "1",
    "0xf9142440d22ce022b5d88062a0b0dce0149e5f65": "1",
    "0x68e750DD425d962f255D3a10Ea649F52be58fe18": "1",
    "0x78C5Fa233Eb07486333B91aCA0A6CFa198B24459": "1",
    "0x5257B8a48Ff01182617f2Fd25E9C1dB0b2dD6475": "1",
    "0xb74F011dac5862822FdF29Fb73dcdE7bCFDaBa7a": "1",
    "0x86C8203Fe8F7d60Afaa0bddA4d92cc5abd901578": "1",
    "0x3F99345b567054BC89950Cb96e189FaF7e1bd0d4": "1",
    "0xCe90a7949bb78892F159F428D0dC23a8E3584d75": "1",
    "0x5aEfCB0F364AdbAFC197f91c8496a488bA90C3d1": "1",
    "0xA0493410c8EAb06CbE48418021DcbacDB04303Ab": "1",
    "0xAd5B657416fbA43CAF6C65Ec8e8DD847d6700286": "1",
    "0x6F41a9ab54f7665314768Ebd72AF6bB97c6D85dA": "1",
    "0x1623e9C3dE4D23e6dDF408Dcfa895AD64a63b6c4": "1",
    "0x7C594337490Fab2f846b87E4016ECc8893A0659c": "1",
    "0xD48727Db439d84fb0a76B4ffa27022e97f127e40": "1",
    "0x1BD11705B5fAbC289CD86185c713F1bb312CF6cF": "1",
    "0x865F4a8DF2fd96Ca19716fB09D64d5b277752215": "1",
    "0x7decDe2e9142B97141A9F7037De5A8f10F30e2ea": "1",
    "0xd1896726684d0dcE1800b08889d354edD74A65a8": "1",
    "0xD9254C4a62154F7d2bA05767b266722Ff52Cb084": "1",
    "0xCfc34220DAbd0afA999Db309d9789A463E344380": "1",
    "0x6E0677b81C770Ec3b0731522fbe32bCf8939f121": "1",
    "0x9416fEe527DB7Cb6fABEeeED4623cE372BE13Fd6": "1",
    "0x7F8C6BC33e482dbA5f2Ba175Cf1F3dDe25406493": "1",
    "0x7E385CFD0187b841FA3F3B6791A097c34050FBa1": "1",
    "0xE3370C6Ae02A381035919d191f4de2CaC0676159": "1",
    "0x48c7bD3d98021B39b19acFD0600DFAc583EB6b64": "1",
    "0x4eC619dc0C53201Bf7f5981f0Ac0a97f93Ef937b": "1",
    "0x7E41E492351e46ce82dfD0d373E6e519a02F9a69": "1",
    "0x67e53ec8e053b2de1ef69fb75482716EBB895351": "1",
    "0xbaB9B860032a0a880C38F8718B5207CfCe23d576": "1",
    "0xeCa48e391E4eA76CD52328C73A549BE86Ce99f8D": "1",
    "0x56220885fCAcB59D46e26E62887B83A377DEB11b": "1",
    "0xeCd49fA04513201450083C9B6dE1ba1e81d8B05F": "1",
    "0xD1ac1e553E029f5dE5732C041DfC9f8CEd937A20": "1",
    "0x1598535C9e05E2130F9F239B2F23215166Bb41a7": "1",
    "0x54D07CFa91F05Fe3B45d8810feF05705117AFe53": "1",
    "0xdc7B03E4F3a7B85F7A20e594D14a59B072000dfb": "1",
    "0x2de24A0f61B68C33BEC50b3f03cAd65aAa9c02b2": "1",
    "0x3CaC432C071268a631c012f915A9dC09Ff19720a": "1",
    "0x64823dFE07091EeA62ED39B01a710D0f62BB663D": "1",
    "0x91F508B7a13a98B667192692E074a120B30a63CF": "1",
    "0xB807D0789E5086bDf7D0A66d12406dB40fc8Bc90": "1",
    "0x4C88FE50000606F1E61fE3F6Fa501423e2f60553": "1",
    "0x37a3549d89a881b66529e82164bab42235981693": "1",
    "0x235A7e021d553963Fd62908C96a892025b32f234": "1",
    "0x18f7AE252DB4190577173CE416a64812519Ee31E": "1",
    "0xDecade78120A1fadac0903DEeA733192dC6a530E": "1",
    "0x02F9c6044b4EB4e3fe8a2204161221AE0D0a912c": "1",
    "0x1119Db8024e07Bd8D335164d3c8AE974fe62a97d": "1",
    "0x4664e2357A99011406D230a25C60cB5590c231f2": "1",
    "0x753B74a202f37a1209eB2Db3169a84C0FDFF2316": "1",
    "0xf1657BF67c1D9eb603687b495584aCab0B456E76": "1",
    "0x2765f720b98e5AFE501f7d190af575d2232273da": "1",
    "0x0363769D5F71918B2dC6676145579b190c734cAF": "1",
    "0xdC39a97f375beF995e8DD417182F77dae95f26C5": "1",
    "0x487F09bD7554e66f131e24edC1EfEe0e0Dfa7fD1": "1",
    "0xd1D9F52d63e3736908c6e7D868f785d30Af5e3AC": "1",
    "0xDF3c501ef5aBeFff2d7Ce1eB75B205F60C66778A": "1",
    "0xC3749227c8781F2189F7fc1Bf1104739D068C7C7": "1",
    "0x77f673Cb3602824440A4c602f0cDA224aAa41D6A": "1",
    "0x7C7A81A4E96d57B827b9e801651a4be16A95A0F5": "1",
    "0xA6c5e4C08087a560c8c8087d11692411951BEBc7": "1",
    "0x118Ca661F189376DdD8f9a32Be6bbc963Eb46D7B": "1",
    "0xF1279239d782Cd522649fbE086046d2Cc6f54ab1": "1",
    "0x577Acf21a0EE097Ee5E0Eb068A5128e381750eDd": "1",
    "0x9d51a7692c6d5648137c07bdb950e82ea2026079": "1",
    "0x89f862f870de542c2d91095CCBbCE86cA112A72a": "1",
    "0xd75aB5D7B1F65eEFc8B6A08EDF08e6FFbB014408": "1",
    "0xd2E2E23b9f82e1351cB38987DA181c22D0492AAB": "1",
    "0xdf2E60Af57C411F848B1eA12B10a404d194bce27": "1",
    "0xbef4Eb89D92c198E2d02F36989fEb4EB12f0d0c8": "1",
    "0x16BAcD96aA34857cCbC676910985CC319865cCC8": "1",
    "0x433e8B0b56c25Cb43099dFF2Ee6a626325654014": "1",
    "0xc183b19E7d8c968FB06c4bCc84BBaF515D123DC5": "1",
    "0x5793cBe17b960841f26C9a000dD782B974A5C233": "1",
    "0x73d02Fe8a22a0f1dba3089D8F1C4abf7f7dAC527": "1",
    "0x05B05b131b76Cc4b09f2689Bb567c48132934Bf4": "1",
    "0x738e3f60c8F476C067d49f25B21580f88eBea81A": "1",
    "0x7EBF4135b99D818e83dd717CE001e65fB648aF87": "1",
    "0x983a33dFd21C23b8250cb315B3170DaC9C5eF0D5": "1",
    "0xC4640FD7268cB043C9c7a673fBd73AB8BFAC11C2": "1",
    "0xEdb0706e48b960DC04002aB1a8B5881843c44529": "1",
    "0x1418dD1F704CF4bFF0532F7077B8D2ebD7FA20DA": "1"
  }`);

  const insiderGKClaimJSON_Testnet = JSON.parse(`{
    "0xBD3Feab37Eb7533B03bf77381D699aD8bA64A30B": "1",
    "0x643367af2Ae07EBFbDE7599eB0855A19c24dca5F": "1",
    "0x2f8ECC5A549638630C094a3DB3849f1ba27C31B1": "1",
    "0x98375cB9Dc4a14b46a4C8b284880C7C277f4c8bc": "1",
    "0x948c21e4e9e342e083424b6132fc29644c6c0a9f": "1",
    "0x341dE5B426d3582f35357094Ae412cf4E41774Cd": "1",
    "0x338eFdd45AE7D010da108f39d293565449C52682": "1"
  }`);

  const insiderGKClaimJSON = network === "goerli" ? insiderGKClaimJSON_Testnet : insiderGKClaimJSON_Mainnet;

  const merkleResultInsider = parseBalanceMap(insiderGKClaimJSON);
  const merkleRootInsider = merkleResultInsider.merkleRoot;
  await deployedGenesisKeyTeamDistributor.changeMerkleRoot(merkleRootInsider);
  const insiderJSON = JSON.stringify(merkleResultInsider, null, 2);
  fs.writeFileSync(`./tasks/merkle/gkInsider/${getNetwork(hre)}-${new Date()}.json`, insiderJSON);
  console.log(`saved merkle gkInsider ${getNetwork(hre)}`);

  console.log(chalk.green("merkleRootInsider: ", merkleRootInsider));
  console.log(chalk.green("deployedGenesisKeyTeamDistributor: ", deployedGenesisKeyTeamDistributor.address));
});

// STEP 2 deploy:NFT.com
task("deploy:2").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));
  // NFT TOKEN ========================================================================================
  // const NftToken = await hre.ethers.getContractFactory("NftToken");
  // const deployedNftToken = await NftToken.attach((await getTokens(hre)).deployedNftTokenAddress);

  // TODO: DEPLOY THESE LATER WHEN NFT TOKEN EXISTS
  // NFT STAKE ============================================================================
  // const NftStake = await hre.ethers.getContractFactory("NftStake");
  // const deployedNftStake = await NftStake.deploy(
  //   deployedNftToken.address,
  // );
  // console.log(chalk.green(`deployedNftStake: ${deployedNftStake.address}`));

  // NftProfileHelper =================================================================================
  const NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
  const deployedNftProfileHelper = await NftProfileHelper.deploy();
  console.log(chalk.green(`deployedNftProfileHelper: ${deployedNftProfileHelper.address}`));

  // NFT PROFILE ======================================================================================
  const NftProfile = await hre.ethers.getContractFactory("NftProfile");
  const deployedNftProfileProxy = await hre.upgrades.deployProxy(
    NftProfile,
    [
      "NFT.com Profile", // string memory name,
      "NFTPROFILE", // string memory symbol,
      (await getTokens(hre)).profileMetadataLink,
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedNftProfileProxy: ${deployedNftProfileProxy.address}`));

  // TODO: DEPLOY THESE LATER WHEN NFT TOKEN EXISTS
  // NFT BUYER ========================================================================================
  // const NftBuyer = await hre.ethers.getContractFactory("NftBuyer");
  // const deployedNftBuyer = await NftBuyer.deploy(
  //   UNI_V2_FACTORY,
  //   deployedNftStake.address,
  //   deployedNftToken.address,
  //   (
  //     await getTokens(hre)
  //   ).wethAddress,
  // );
  // console.log(chalk.green(`deployedNftBuyer: ${deployedNftBuyer.address}`));

  // PROFILE AUCTION =================================================================================
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");
  const deployedProfileAuction = await hre.upgrades.deployProxy(
    ProfileAuction,
    [
      deployedNftProfileProxy.address,
      (await getTokens(hre)).governor,
      deployedNftProfileHelper.address,
      (await getTokens(hre)).deployedGenesisKeyAddress,
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedProfileAuction: ${deployedProfileAuction.address}`));
  await deployedNftProfileProxy.setProfileAuction(deployedProfileAuction.address);

  if (!mainnetBool(hre)) {
    await deployedProfileAuction.setSigner(process.env.PUBLIC_SALE_SIGNER_ADDRESS);
  }

  // VERIFICATION =====================================================================================
  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  // await verifyContract(
  //   "deployedNftStake",
  //   deployedNftStake.address,
  //   [deployedNftToken.address],
  //   hre,
  // );
  await verifyContract("deployedNftProfileHelper", deployedNftProfileHelper.address, [], hre);

  await getImplementation("deployedNftProfile", deployedNftProfileProxy.address, hre);

  // await verifyContract(
  //   "deployedNftBuyer",
  //   deployedNftBuyer.address,
  //   [UNI_V2_FACTORY, deployedNftStake.address, deployedNftToken.address, (await getTokens(hre)).wethAddress],
  //   hre,
  // );

  await getImplementation("deployedProfileAuction", deployedProfileAuction.address, hre);
});

// new code for nft resolvers
task("deploy:2b").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying resolvers"));

  const deployedEthereumRegex = await (await hre.ethers.getContractFactory("EthereumRegex")).deploy();
  console.log(chalk.green(`deployedEthereumRegex: ${deployedEthereumRegex.address}`));

  const NftResolver = await hre.ethers.getContractFactory("NftResolver");
  const deployedNftResolver = await hre.upgrades.deployProxy(NftResolver, [(await getTokens(hre)).deployedNftProfile], {
    kind: "uups",
  });

  console.log(chalk.green(`deployedNftResolver: ${deployedNftResolver.address}`));

  await deployedNftResolver.setRegex(0, deployedEthereumRegex.address);

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);

  await verifyContract("deployedEthereumRegex", deployedEthereumRegex.address, [], hre);

  await getImplementation("deployedNftResolver", deployedNftResolver.address, hre);
});

task("deploy:2c").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying nft tx router"));

  // const LooksrareLibV1 = await hre.ethers.getContractFactory("LooksrareLibV1");
  // const deployedLooksrareLibV1 = await LooksrareLibV1.deploy();
  // await waitTx("deployedLooksrareLibV1", deployedLooksrareLibV1, hre);

  // const SeaportLib1_1 = await hre.ethers.getContractFactory("SeaportLib1_1");
  // const deployedSeaportLib1_1 = await SeaportLib1_1.deploy();
  // await waitTx("deployedSeaportLib1_1", deployedSeaportLib1_1, hre);

  // const X2Y2LibV1 = await hre.ethers.getContractFactory("X2Y2LibV1");
  // const deployedX2Y2LibV1 = await X2Y2LibV1.deploy();
  // await waitTx("deployedX2Y2LibV1", deployedX2Y2LibV1, hre);

  const NativeNftTradingLib = await hre.ethers.getContractFactory("NativeNftTradingLib");
  const deployedNativeNftTradingLib = await NativeNftTradingLib.deploy();
  await waitTx("deployedNativeNftTradingLib", deployedNativeNftTradingLib, hre);

  const MarketplaceRegistry = await hre.ethers.getContractFactory("MarketplaceRegistry");
  const deployedMarketplaceRegistry = MarketplaceRegistry.attach((await getTokens(hre)).deployedMarketplaceRegistry);
  // const deployedMarketplaceRegistry = await hre.upgrades.deployProxy(MarketplaceRegistry, [], {
  //   kind: "uups",
  // });
  // await waitTx("deployedMarketplaceRegistry", deployedMarketplaceRegistry, hre);

  // const CryptoPunks = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";
  // const Mooncats = "0x60cd862c9C687A9dE49aecdC3A99b74A4fc54aB6";
  // const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");
  // const deployedNftAggregator = await hre.upgrades.deployProxy(NftAggregator, [(await getTokens(hre)).deployedMarketplaceRegistry, CryptoPunks, Mooncats], {
  //   kind: "uups",
  //   unsafeAllow: ["delegatecall"],
  // });

  // const MarketplaceRegistry = await hre.ethers.getContractFactory("MarketplaceRegistry");
  // const deployedMarketplaceRegistry = await MarketplaceRegistry.attach((await getTokens(hre)).deployedMarketplaceRegistry);
  // console.log(chalk.green("deployedNftAggregator: ", deployedNftAggregator.address));
  // await deployedMarketplaceRegistry.addMarketplace((await getTokens(hre)).deployedLooksrareLibV1 /* deployedLooksrareLibV1.address */, true);
  // await deployedMarketplaceRegistry.addMarketplace((await getTokens(hre)).deployedSeaportLib1_1 /* deployedSeaportLib1_1.address */, true);
  await deployedMarketplaceRegistry.addMarketplace(
    /* (await getTokens(hre)).deployedX2Y2Lib  */ deployedNativeNftTradingLib.address,
    true,
  );

  await deployedMarketplaceRegistry.setMarketplaceStatus(4, false);

  // console.log(chalk.green(`${(TIME_DELAY * 3) / 1000} second delay`));
  // await delay(TIME_DELAY * 3);
  // console.log(chalk.green("verifying..."));

  // await verifyContract("deployedLooksrareLibV1", (await getTokens(hre)).deployedLooksrareLibV1 /* deployedLooksrareLibV1.address */, [], hre);
  // await verifyContract("deployedSeaportLib1_1", (await getTokens(hre)).deployedSeaportLib1_1 /* deployedSeaportLib1_1.address */, [], hre);
  // await verifyContract("deployedX2Y2LibV1", (await getTokens(hre)).deployedX2Y2Lib /* deployedX2Y2LibV1.address */, [], hre);

  // await getImplementation("deployedMarketplaceRegistry", deployedMarketplaceRegistry.address, hre);
  // await getImplementation("deployedNftAggregator", deployedNftAggregator.address, hre);
});

task("add-x2y2-aggregator").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("adding x2y2 to aggregator"));
  const X2Y2LibV1 = await hre.ethers.getContractFactory("X2Y2LibV1");
  const deployedX2Y2LibV1 = await X2Y2LibV1.deploy();
  await waitTx("deployedX2Y2LibV1", deployedX2Y2LibV1, hre);

  const MarketplaceRegistry = await hre.ethers.getContractFactory("MarketplaceRegistry");
  const deployedMarketplaceRegistry = await MarketplaceRegistry.attach(
    (
      await getTokens(hre)
    ).deployedMarketplaceRegistry,
  );

  await deployedMarketplaceRegistry.addMarketplace(deployedX2Y2LibV1.address, true);
});

task("testResolver").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to test resolver"));
  const account2 = "0x1958Af77c06faB96D63351cACf10ABd3f598873B"; // 0x1958Af77c06faB96D63351cACf10ABd3f598873B, 0xbBc0643F58Afa61F3afa921A43115639199619fa

  const NftResolver = await hre.ethers.getContractFactory("NftResolver");
  const deployedNftResolver = await NftResolver.attach((await getTokens(hre)).deployedNftResolver);

  await deployedNftResolver.addAssociatedAddresses([{ cid: 0, chainAddr: account2 }], "gk");

  // await deployedNftResolver
  //   .removeAssociatedAddress(
  //     { cid: 0, chainAddr: account2 },
  //     "gk",
  //   );

  // await deployedNftResolver.clearAssociatedAddresses("gk");
});

task("batchBuy").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to batch buy"));

  const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");
  const deployedNftAggregator = await NftAggregator.attach((await getTokens(hre)).deployedNftAggregator);

  const seaportOrders = {
    order: [
      {
        contractAddress: "0x530e404f51778f38249413264ac7807a16b88603",
        tokenId: "56",
        msgValue: hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString()), // 0 if ETH
      },
    ],
    recipient: "0x338eFdd45AE7D010da108f39d293565449C52682",
    chainID: "4",
    failIfRevert: true,
  };

  const looksrareOrders =
    [
      // {
      //   contractAddress: "0xe0060010c2c81A817f4c52A9263d4Ce5c5B66D55",
      //   tokenId: "4955",
      //   msgValue: hre.ethers.BigNumber.from((0.012 * 10 ** 18).toString()), // 0 if not ETH
      //   executorAddress: (await getTokens(hre)).deployedNftAggregator,
      //   chainID: "5",
      //   failIfRevert: true,
      // },
    ] || new Array<LooksrareInput>();

  const { totalValue, combinedOrders } = await combineOrders(seaportOrders as SeaportCompleteInput, looksrareOrders);

  console.log("combinedOrders: ", combinedOrders);
  console.log("totalValue: ", totalValue);

  // console.log(
  //   "purchase hex: ",
  //   await deployedNftAggregator.interface.encodeFunctionData("batchTradeWithETH", [combinedOrders, [], [0, 0]]),
  // );

  // try {
  //   const tx = await deployedNftAggregator.batchTradeWithETH(combinedOrders, [], [0, 0], { value: totalValue });

  //   console.log(chalk.green("batch buy with eth: ", tx.hash));
  // } catch (err) {
  //   console.log("error while batch trading: ", err);
  // }
});

// ========================================================
// TODO: make sure nftBuyer (contract1) is set in profile Auction
// TODO: make sure nftNftStake (contract2) is set in profile Auction
// ========================================================

task("deploy:buyer/stake").setAction(async function (taskArguments, hre) {
  // const NftStake = await hre.ethers.getContractFactory("NftStake");
  // const deployedNftStake = await NftStake.deploy(
  //   (await getTokens(hre)).deployedNftTokenAddress,
  // );
  // console.log(chalk.green(`deployedNftStake: ${deployedNftStake.address}`));

  // const NftBuyer = await hre.ethers.getContractFactory("NftBuyer");
  // const deployedNftBuyer = await NftBuyer.deploy(
  //   UNI_V2_FACTORY,
  //   deployedNftStake.address,
  //   (await getTokens(hre)).deployedNftTokenAddress,
  //   (
  //     await getTokens(hre)
  //   ).wethAddress,
  // );
  // console.log(chalk.green(`deployedNftBuyer: ${deployedNftBuyer.address}`));

  // await delay(TIME_DELAY);

  await verifyContract(
    "deployedNftStake",
    (
      await getTokens(hre)
    ).deployedNftStake,
    [(await getTokens(hre)).deployedNftTokenAddress],
    hre,
  );

  await verifyContract(
    "deployedNftBuyer",
    (
      await getTokens(hre)
    ).deployedNftBuyer,
    [
      UNI_V2_FACTORY,
      (await getTokens(hre)).deployedNftStake,
      (await getTokens(hre)).deployedNftTokenAddress,
      (await getTokens(hre)).wethAddress,
    ],
    hre,
  );
});

// Step 3 NftMarketplace
task("deploy:3").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
  const deployedNftMarketplace = NftMarketplace.attach((await getTokens(hre)).deployedNftMarketplace);
  const NftTransferProxy = await hre.ethers.getContractFactory("NftTransferProxy");
  const deployedNftTransferProxy = NftTransferProxy.attach((await getTokens(hre)).deployedNftTransferProxy);
  const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
  const deployedERC20TransferProxy = ERC20TransferProxy.attach((await getTokens(hre)).deployedERC20TransferProxy);
  const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");
  const deployedCryptoKittyTransferProxy = CryptoKittyTransferProxy.attach(
    (await getTokens(hre)).deployedCryptoKittyTransferProxy,
  );
  const ValidationLogic = await hre.ethers.getContractFactory("ValidationLogic");
  const deployedValidationLogic = ValidationLogic.attach((await getTokens(hre)).deployedValidationLogic);
  const MarketplaceEvent = await hre.ethers.getContractFactory("MarketplaceEvent");
  const deployedMarketplaceEvent = MarketplaceEvent.attach((await getTokens(hre)).deployedMarketplaceEvent);
  // const NftProfile = await hre.ethers.getContractFactory("NftProfile");
  // const deployedNftProfile = NftProfile.attach((await getTokens(hre)).deployedNftProfile);

  // const deployedNftTransferProxy = await hre.upgrades.deployProxy(NftTransferProxy, { kind: "uups" });
  // console.log(chalk.green("nftTransferProxy: ", deployedNftTransferProxy.address));

  // const deployedERC20TransferProxy = await hre.upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
  // console.log(chalk.green("deployedERC20TransferProxy: ", deployedERC20TransferProxy.address));

  // const deployedCryptoKittyTransferProxy = await hre.upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });
  // console.log(chalk.green("deployedCryptoKittyTransferProxy: ", deployedCryptoKittyTransferProxy.address));

  // const deployedValidationLogic = await hre.upgrades.deployProxy(ValidationLogic, { kind: "uups" });
  // console.log(chalk.green("deployedValidationLogic: ", deployedValidationLogic.address));

  // const deployedMarketplaceEvent = await hre.upgrades.deployProxy(MarketplaceEvent, { kind: "uups" });
  // console.log(chalk.green("deployedMarketplaceEvent: ", deployedMarketplaceEvent.address));

  // const deployedNftMarketplace = await hre.upgrades.deployProxy(
  //   NftMarketplace,
  //   [
  //     deployedNftTransferProxy.address,
  //     deployedERC20TransferProxy.address,
  //     deployedCryptoKittyTransferProxy.address,
  //     '0x1d438f0Ca004E3Ec155Df9E7e0457215483de8D5', // (await getTokens(hre)).deployedNftBuyer,
  //     '0x0000000000000000000000000000000000000000', // (await getTokens(hre)).deployedNftTokenAddress,
  //     deployedValidationLogic.address,
  //     deployedMarketplaceEvent.address,
  //     deployedNftProfile.address,
  //   ],
  //   { kind: "uups" },
  // );

  // console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  // await deployedMarketplaceEvent.setMarketPlace(deployedNftMarketplace.address);

  // await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).wethAddress, true);
  // console.log(chalk.green("whitelisted WETH: ", (await getTokens(hre)).wethAddress));
  // await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).usdcAddress, true);
  // console.log(chalk.green("whitelisted USDC: ", (await getTokens(hre)).usdcAddress));
  // // await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).deployedNftTokenAddress, true);
  // // console.log(chalk.green("whitelisted NftToken: ", (await getTokens(hre)).deployedNftTokenAddress));

  // // add operator being the marketplace
  // await deployedNftTransferProxy.addOperator(deployedNftMarketplace.address);
  // await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  // await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  // console.log(chalk.green("finished deploying nft marketplace contracts!"));

  console.log(chalk.green("verifying..."));
  // await getImplementation("deployedNftTransferProxy", deployedNftTransferProxy.address, hre);
  // await getImplementation("deployedERC20TransferProxy", deployedERC20TransferProxy.address, hre);
  // await getImplementation("deployedCryptoKittyTransferProxy", deployedCryptoKittyTransferProxy.address, hre);
  // await getImplementation("deployedValidationLogic", deployedValidationLogic.address, hre);
  // //
  // await getImplementation("deployedMarketplaceEvent", deployedMarketplaceEvent.address, hre);
  await getImplementation("deployedNftMarketplace", deployedNftMarketplace.address, hre);
});

task("test:nativePurchase").setAction(async function (taskArguments, hre) {
  try {
    const chainId = hre.network.config.chainId;
    const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

    if (network != "goerli") {
      console.log(chalk.red(`native purchase flow must be on goerli`));
      return;
    }

    console.log(chalk.green(`starting a native purchase flow on goerli`));

    const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
    const deployedNftMarketplace = NftMarketplace.attach((await getTokens(hre)).deployedNftMarketplace);
    const NftTransferProxy = await hre.ethers.getContractFactory("NftTransferProxy");
    const deployedNftTransferProxy = NftTransferProxy.attach((await getTokens(hre)).deployedNftTransferProxy);
    const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
    const deployedGenesisKey = GenesisKey.attach((await getTokens(hre)).deployedGenesisKeyAddress);

    // const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
    // const deployedERC20TransferProxy = ERC20TransferProxy.attach((await getTokens(hre)).deployedERC20TransferProxy);
    // const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");
    // const deployedCryptoKittyTransferProxy = CryptoKittyTransferProxy.attach((await getTokens(hre)).deployedCryptoKittyTransferProxy);
    // const ValidationLogic = await hre.ethers.getContractFactory("ValidationLogic");
    // const deployedValidationLogic = ValidationLogic.attach((await getTokens(hre)).deployedValidationLogic);
    // const MarketplaceEvent = await hre.ethers.getContractFactory("MarketplaceEvent");
    // const deployedMarketplaceEvent = MarketplaceEvent.attach((await getTokens(hre)).deployedMarketplaceEvent);

    const ownerAddress = "0x59495589849423692778a8c5aaca62ca80f875a4";
    const sellAsset = deployedGenesisKey.address; // genesis key on goerli
    const sellAssetTokenId = 9912;

    const takeAsset = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"; // weth on goerli

    // approvals
    await deployedGenesisKey.approve(deployedNftTransferProxy.address, sellAssetTokenId);

    const ownerSigner = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "");
    const buyerSigner = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "", "m/44'/60'/0'/0/1");

    // TODO: make this call manually
    // await deployedNftToken.connect(buyer).approve(deployedERC20TransferProxy.address, MAX_UINT);

    // should succeed
    // await deployedNftMarketplace.connect(buyer).approveOrder_(buyOrder);

    console.log(chalk.green(`signing...`));

    const {
      v: v0,
      r: r0,
      s: s0,
      order: sellOrder,
    } = await signMarketplaceOrder(
      ownerSigner,
      [
        // makerAsset Array
        [
          ERC721_ASSET_CLASS, // asset class
          ["address", "uint256", "bool"], // types
          [sellAsset, sellAssetTokenId, true], // values
          [1, 0], // data to be encoded
        ],
      ],
      hre.ethers.constants.AddressZero,
      [[ERC20_ASSET_CLASS, ["address"], [takeAsset], [convertSmallNftToken(10), convertSmallNftToken(1)]]],
      0,
      0,
      Number(await deployedNftMarketplace.nonces(ownerAddress)),
      hre.ethers.provider,
      deployedNftMarketplace.address,
      AuctionType.English,
    );

    const {
      v: v1,
      r: r1,
      s: s1,
      order: buyOrder,
    } = await signMarketplaceOrder(
      buyerSigner,
      [[ERC20_ASSET_CLASS, ["address"], [takeAsset], [convertSmallNftToken(5), 0]]],
      ownerAddress,
      [[ERC721_ASSET_CLASS, ["address", "uint256", "bool"], [sellAsset, sellAssetTokenId, true], [1, 0]]],
      0,
      0,
      Number(await deployedNftMarketplace.nonces(ownerAddress)),
      hre.ethers.provider,
      deployedNftMarketplace.address,
      AuctionType.English,
    );

    console.log(chalk.green(`executing...`));

    await deployedNftMarketplace.executeSwap(sellOrder, buyOrder, [v0, v1], [r0, r1], [s0, s1]);
  } catch (err) {
    console.log(err);
  }
});

// STEP 4 Airdrop (wait until ready)
task("deploy:4").setAction(async function (taskArguments, hre) {
  // Profile Distributor Merkle ========================================================================
  // TODO: add in correct JSON mapping
  const jsonInput = JSON.parse(`{
    "0x59495589849423692778a8c5aaCA62CA80f875a4": "100",
  }`);

  // merkle result is what you need to post publicly and store on FE
  const merkleResult = parseBalanceMap(jsonInput);
  const { merkleRoot } = merkleResult;

  const MerkleDistributor = await hre.ethers.getContractFactory("MerkleDistributor");

  const deployedNftTokenAirdrop = await MerkleDistributor.deploy(
    (
      await getTokens(hre)
    ).deployedNftTokenAddress,
    merkleRoot,
  );
  console.log(chalk.green(`deployedNftTokenAirdrop: ${deployedNftTokenAirdrop.address}`));

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await verifyContract(
    "deployedNftTokenAirdrop",
    deployedNftTokenAirdrop.address,
    [(await getTokens(hre)).deployedNftTokenAddress, merkleRoot],
    hre,
  );
});

// UPGRADES ============================================================================================
task("upgrade:NftProfile").setAction(async function (taskArguments, hre) {
  const NftProfile = await hre.ethers.getContractFactory("NftProfile");

  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

  console.log(chalk.green("starting to upgrade..."));

  if (network == "mainnet") {
    const upgradedNftProfile = await hre.upgrades.prepareUpgrade(
      (
        await getTokens(hre)
      ).deployedNftProfile,
      NftProfile,
      {
        unsafeAllowRenames: true,
      },
    );
    console.log(chalk.green("new upgradedNftProfile imp: ", upgradedNftProfile));

    console.log("upgradedNftProfile: ", upgradedNftProfile);
    // GO TO OZ DEFENDER
    await verifyContract(`upgrade upgradedNftProfile impl`, `${upgradedNftProfile}`, [], hre);
  } else if (network == "goerli") {
    const upgradedNftProfile = await hre.upgrades.upgradeProxy((await getTokens(hre)).deployedNftProfile, NftProfile);
    console.log(chalk.green("upgradedNftProfile: ", upgradedNftProfile.address));

    await delayedVerifyImp("upgradedNftProfile", upgradedNftProfile.address, hre);
  } else {
    console.log(chalk.red("invalid network"));
  }
});

task("upgrade:NftMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");

  const upgradedNftMarketplace = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedNftMarketplace,
    NftMarketplace,
    // {
    //   unsafeAllowRenames: true,
    //   unsafeSkipStorageCheck: true,
    // }
  );
  console.log(chalk.green("upgraded nft marketplace: ", upgradedNftMarketplace.address));
  await delayedVerifyImp("upgradedNftMarketplace", upgradedNftMarketplace.address, hre);
});

task("upgrade:ValidationLogic").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const ValidationLogic = await hre.ethers.getContractFactory("ValidationLogic");

  const upgradedValidationLogic = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedValidationLogic,
    ValidationLogic,
  );
  console.log(chalk.green("upgraded validation logic: ", upgradedValidationLogic.address));
  await delayedVerifyImp("upgradedValidationLogic", upgradedValidationLogic.address, hre);
});

task("upgrade:Vesting").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const Vesting = await hre.ethers.getContractFactory("Vesting");

  const upgradedVesting = await hre.upgrades.upgradeProxy((await getTokens(hre)).deployedVestingAddress, Vesting);
  console.log(chalk.green("upgraded vesting: ", upgradedVesting.address));

  await delayedVerifyImp("upgradedVesting", (await getTokens(hre)).deployedVestingAddress, hre);
});

task("upgrade:GenesisKey").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

  const GenesisKey = await hre.ethers.getContractFactory(network === "goerli" ? "GenesisKey" : "GenesisKey");

  // TODO: verify latest @ 0x6e97723b9ad593bF8A22F8BFaab38c016273aB17
  if (network == "mainnet") {
    // const upgradedGKImp = await hre.upgrades.prepareUpgrade(
    //   (
    //     await getTokens(hre)
    //   ).deployedGenesisKeyAddress,
    //   GenesisKey,
    // );
    // console.log(chalk.green("new profile auction imp: ", upgradedGKImp));

    // console.log('upgradedGKImp: ', upgradedGKImp);
    // GO TO OZ DEFENDER
    await verifyContract(
      `upgrade GenesisKey impl`,
      "0x6e97723b9ad593bf8a22f8bfaab38c016273ab17",
      /*`${'upgradedGKImp'}`*/ [],
      hre,
    );
  } else if (network == "goerli") {
    const upgradedGenesisKey = await hre.upgrades.upgradeProxy(
      (
        await getTokens(hre)
      ).deployedGenesisKeyAddress,
      GenesisKey,
    );
    console.log(chalk.green("upgraded genesis key: ", upgradedGenesisKey.address));

    await delayedVerifyImp("upgradedGenesisKey", upgradedGenesisKey.address, hre);
  } else {
    console.log(chalk.red("not mainnet or goerli"));
  }
});

task("upgrade:NftResolver").setAction(async function (taskArguments, hre) {
  // const NftResolver = await hre.ethers.getContractFactory("NftResolver");

  // const upgradedNftResolver = await hre.upgrades.upgradeProxy((await getTokens(hre)).deployedNftResolver, NftResolver);
  // console.log(chalk.green("upgradedNftResolver: ", upgradedNftResolver.address));

  await getImplementation("deployedNftResolver", "0xA657C988e8aC39D3268D390eB7c522a535B10453", hre);
  // await delayedVerifyImp("upgradedNftResolver", upgradedNftResolver.address, hre);
});

task("upgrade:ProfileAuction").setAction(async function (taskArguments, hre) {
  const chainId = hre.network.config.chainId;
  const network = chainId === 5 ? "goerli" : chainId === 1 ? "mainnet" : chainId;

  console.log(chalk.green("starting to upgrade..."));

  if (network == "mainnet") {
    const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");

    const upgradedProfileAuctionAddressImp = await hre.upgrades.prepareUpgrade(
      (
        await getTokens(hre)
      ).deployedProfileAuction,
      ProfileAuction,
      {
        unsafeAllowRenames: true,
      },
    );
    console.log(chalk.green("new profile auction imp: ", upgradedProfileAuctionAddressImp));

    console.log("upgradedProfileAuctionAddressImp: ", upgradedProfileAuctionAddressImp);
    // GO TO OZ DEFENDER
    await verifyContract(`upgrade ProfileAuction impl`, `${upgradedProfileAuctionAddressImp}`, [], hre);
  } else if (network == "goerli") {
    const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");

    const upgradedProfileAuction = await hre.upgrades.upgradeProxy(
      (
        await getTokens(hre)
      ).deployedProfileAuction,
      ProfileAuction,
      // {
      //   unsafeSkipStorageCheck: true
      // },
    );
    console.log(chalk.green("upgradedProfileAuction: ", upgradedProfileAuction.address));

    await delayedVerifyImp("upgradedProfileAuction", upgradedProfileAuction.address, hre);
  } else {
    console.log(chalk.green("unsupported network: " + network));
  }
});

task("upgrade:GenesisKeyTeamClaim").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const GenesisKeyTeamClaim = await hre.ethers.getContractFactory("GenesisKeyTeamClaim");

  const upgradedGenesisKeyTeamClaim = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedGenesisKeyTeamClaimAddress,
    GenesisKeyTeamClaim,
  );
  console.log(chalk.green("upgraded genesis key team claim: ", upgradedGenesisKeyTeamClaim.address));

  await delayedVerifyImp("upgradedGenesisKeyTeamClaim", upgradedGenesisKeyTeamClaim.address, hre);
});

task("upgrade:NftAggregator").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");

  const upgradedNftAggregator = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedNftAggregator,
    NftAggregator,
    {
      unsafeAllow: ["delegatecall"],
      unsafeAllowRenames: true,
    },
  );

  await waitTx("upgradedNftAggregator", upgradedNftAggregator, hre);

  await delayedVerifyImp("upgradedNftAggregator", upgradedNftAggregator.address, hre);
});

task("oneTimeApproval").setAction(async function (taskArguments, hre) {
  const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");
  const deployedNftAggregator = NftAggregator.attach((await getTokens(hre)).deployedNftAggregator);
  console.log(chalk.green("starting to add approval for token... ", deployedNftAggregator.address));

  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const LOOKSRARE_EXCHANGE = "0x59728544b08ab483533076417fbbb2fd0b17ce3a";
  const SEAPORT_1_1 = "0x00000000006c3852cbef3e08e8df289169ede581";
  const MAX_UINT = hre.ethers.BigNumber.from(2).pow(hre.ethers.BigNumber.from(256)).sub(1);

  await deployedNftAggregator.setOneTimeApproval([
    // {
    //   token: USDC_ADDRESS,
    //   operator: LOOKSRARE_EXCHANGE,
    //   amount: MAX_UINT,
    // },
    {
      token: USDC_ADDRESS,
      operator: SEAPORT_1_1,
      amount: MAX_UINT,
    },
  ]);
});

task("deploy:z").setAction(async function (taskArguments, hre) {
  const Test721 = await hre.ethers.getContractFactory("Test721");
  const deployedTest721 = await Test721.deploy();

  console.log("deployedTest721: ", deployedTest721.address);
});

task("z").setAction(async function (taskArguments, hre) {
  const TestRe = await hre.ethers.getContractFactory("TestRe");
  const nat = await TestRe.deploy();
  await nat.donate({ value: hre.ethers.utils.parseEther("0.000001") });
});

task("z:approve:x2y2").setAction(async function (taskArguments, hre) {
  const Test721 = await hre.ethers.getContractFactory("Test721");
  const deployed721 = Test721.attach("0x554CC509C75D8627090421A7dc0E1FfA6DCBB1Eb");
  await deployed721.setApprovalForAll(getNetworkMeta(getNetwork(hre))?.erc721DelegateContract, true);
});
