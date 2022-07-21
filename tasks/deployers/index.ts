import { task } from "hardhat/config";
import chalk from "chalk";
import csv from "csvtojson";
import fs from "fs";
import delay from "delay";
import { parseBalanceMap } from "../../test/utils/parse-balance-map";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

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
  const network = chainId === 5 ? "goerli" : chainId === 4 ? "rinkeby" : chainId === 1 ? "mainnet" : chainId;

  const governor =
    network === "goerli"
      ? "0x59495589849423692778a8c5aaCA62CA80f875a4"
      : network === "mainnet"
      ? "0xbCe52D4698fdE9484901121A7Feb0741BA6d4dF3" // 0xfD64d3f48BA28727608bD6E200AFeaca26Dd7e20 gnosis
      : "";
  const multiSig =
    network === "goerli"
      ? "0x59495589849423692778a8c5aaCA62CA80f875a4"
      : network === "mainnet"
      ? "0xfD64d3f48BA28727608bD6E200AFeaca26Dd7e20"
      : "";
  const wethAddress =
    network === "goerli"
      ? "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
      : network === "mainnet"
      ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
      : network == "rinkeby"
      ? "0xc778417E063141139Fce010982780140Aa0cD5Ab"
      : "";
  const usdcAddress =
    network === "goerli"
      ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      : network === "mainnet"
      ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      : "";
  const deployedNftTokenAddress =
    network == "goerli"
      ? "0x7ffe04f3213d893bb4ebe76fbb49ca2a8f9c4610"
      : network === "mainnet"
      ? "0x8C42428a747281B03F10C80e978C107D4d85E37F"
      : "";
  const deployedVestingAddress =
    network == "goerli"
      ? "0x0638A014c45BE910d4611bAfaBcC8219A075788B"
      : network === "mainnet"
      ? "0x774c2204D9e50CD9d6A579D194c067360604933f"
      : "";
  const deployedGenesisKeyAddress =
    network == "goerli"
      ? "0xe0060010c2c81A817f4c52A9263d4Ce5c5B66D55"
      : network === "mainnet"
      ? "0x8fB5a7894AB461a59ACdfab8918335768e411414"
      : "";
  const genesisKeyTeamDistributorAddress =
    network == "goerli"
      ? "0x85c7fBFD62C4470Ee6C0Eb8a722c92d7cD840A11"
      : network === "mainnet"
      ? "0x5fb1941b5415b4817d9CC62f8039F7A4B366Ff8F"
      : "";
  const deployedGenesisKeyTeamClaimAddress =
    network == "goerli"
      ? "0x7B7d88d7718294E27575aA7F4d1e2F25fF51b81c"
      : network === "mainnet"
      ? "0xfc99E6b4447a17EA0C6162854fcb572ddC8FbB37"
      : "";
  const deployedProfileAuction =
    network == "goerli"
      ? "0x40023d97Ca437B966C8f669C91a9740C639E21C3"
      : network === "mainnet"
      ? "0x30f649D418AF7358f9c8CB036219fC7f1B646309"
      : "";
  const deployedNftProfile =
    network == "goerli"
      ? "0x9Ef7A34dcCc32065802B1358129a226B228daB4E"
      : network === "mainnet"
      ? "0x7e229a305f26ce5C39AAB1d90271e1Ef03d764D5"
      : "";
  const deployedNftResolver =
    network == "goerli" ? "0x45d296A1042248F48f484c6f2be01006D26fCBF0" : network === "mainnet" ? "" : "";
  const deployedNftAggregator =
    network == "goerli"
      ? ""
      : network == "mainnet"
      ? ""
      : network == "rinkeby"
      ? "0x6579A513E97C0043dC3Ad9Dfd3f804721023a309"
      : "";
  const profileMetadataLink = `https://${
    network === "goerli" ? "staging-api" : network === "mainnet" ? "prod-api" : ""
  }.nft.com/uri/`;
  const deployedNftBuyer =
    network == "goerli" ? "0x1823c26FC21f124BB61256420000C3B531BF1D40" : network === "mainnet" ? "" : "";
  const ipfsHash =
    network == "goerli"
      ? "ipfs://QmdzBQBCoFxkrtkh3gkQ6U59VmvwEh4c6VUf7LHyYjqqBL/"
      : network == "mainnet"
      ? "ipfs://QmWjL5P4P9324pNDfDTHpwwNLWrwXEFUNuaR2r93sxd7mF/"
      : "";

  return {
    governor,
    wethAddress,
    usdcAddress,
    deployedNftTokenAddress,
    deployedVestingAddress,
    deployedGenesisKeyAddress,
    genesisKeyTeamDistributorAddress,
    profileMetadataLink,
    deployedNftBuyer,
    ipfsHash,
    deployedGenesisKeyTeamClaimAddress,
    multiSig,
    deployedProfileAuction,
    deployedNftProfile,
    deployedNftResolver,
    deployedNftAggregator,
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
    const address = jsonCSV.map(row => row.Address);
    const amount = jsonCSV.map(row =>
      hre.ethers.BigNumber.from(row.ParsedToken.replaceAll(",", "").replace(".00", "")).mul(
        hre.ethers.BigNumber.from(10).pow(18),
      ),
    );
    const vestingBegin = jsonCSV.map(row => row.Begin);
    const vestingCliff = jsonCSV.map(row => row.Cliff);
    const vestingEnd = jsonCSV.map(row => row.End);
    const vestingInstallment = jsonCSV.map(row => row.Installment);

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
    "0x7C7A81A4E96d57B827b9e801651a4be16A95A0F5": "1"
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
  // NFT GENESIS KEY STAKE ============================================================================
  // const GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
  // const deployedNftGenesisStake = await GenesisStake.deploy(
  //   deployedNftToken.address,
  //   (
  //     await getTokens(hre)
  //   ).deployedGenesisKeyAddress,
  // );
  // console.log(chalk.green(`deployedNftGenesisStake: ${deployedNftGenesisStake.address}`));

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
  //   deployedNftGenesisStake.address,
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
  //   "deployedNftGenesisStake",
  //   deployedNftGenesisStake.address,
  //   [deployedNftToken.address, (await getTokens(hre)).deployedGenesisKeyAddress],
  //   hre,
  // );
  await verifyContract("deployedNftProfileHelper", deployedNftProfileHelper.address, [], hre);

  await getImplementation("deployedNftProfile", deployedNftProfileProxy.address, hre);

  // await verifyContract(
  //   "deployedNftBuyer",
  //   deployedNftBuyer.address,
  //   [UNI_V2_FACTORY, deployedNftGenesisStake.address, deployedNftToken.address, (await getTokens(hre)).wethAddress],
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

  const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");
  const deployedNftAggregator = await hre.upgrades.deployProxy(NftAggregator, [], {
    kind: "uups",
  });

  console.log(chalk.green(`deployedNftAggregator: ${deployedNftAggregator.address}`));

  await getImplementation("deployedNftAggregator", deployedNftAggregator.address, hre);
});

task("testResolver").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to test resolver"));
  const account2 = '0x1958Af77c06faB96D63351cACf10ABd3f598873B'; 

  const NftResolver = await hre.ethers.getContractFactory("NftResolver");
  const deployedNftResolver = await NftResolver.attach(
    (
      await getTokens(hre)
    ).deployedNftResolver,
  );

  await deployedNftResolver
    .addAssociatedAddresses(
      [{ cid: 0, chainAddr: account2 }],
      "gk",
    );

  // await deployedNftResolver
  //   .removeAssociatedAddress(
  //     { cid: 0, chainAddr: account2 },
  //     "gk",
  //   );
});

task("testPurchaseLooksrare").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to purchase looksrare"));

  const NftAggregator = await hre.ethers.getContractFactory("NftAggregator");
  const deployedNftAggregator = await NftAggregator.attach((await getTokens(hre)).deployedNftAggregator);

  const WETH = await hre.ethers.getContractFactory("WETH");
  const deployedWETH = await WETH.attach((await getTokens(hre)).wethAddress);

  // console.log('deployedWETH: ', deployedWETH.address);
  // console.log('deployedNftAggregator: ', deployedNftAggregator.address);

  // const tx = await deployedWETH.approve(deployedNftAggregator.address, hre.ethers.BigNumber.from(2).pow(hre.ethers.BigNumber.from(256)).sub(1));

  // console.log('aproval tx...: ', tx.hash);

  // const tx2 = await deployedWETH.deposit({ value: hre.ethers.BigNumber.from(10).pow(17)});

  // console.log('deposit tx2...: ', tx2.hash);

  // const tx3 = await deployedNftAggregator.purchaseLooksrare(
  //   {
  //     tokenAddrs: [deployedWETH.address],
  //     amounts: ['10000000000000000']
  //   },
  //   [{
  //     marketId: 0,
  //     value: 0,
  //     tradeData: `0x38e292090000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006579a513e97c0043dc3ad9dfd3f804721023a309000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000001d4c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000059495589849423692778a8c5aaca62ca80f875a400000000000000000000000033acfb7d8ef4fbeeb4d837c7e90b8f74e219daf7000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000732319a3590e4fa838c111826f9584a9a2fdea1a000000000000000000000000c778417e063141139fce010982780140aa0cd5ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000062ced33c0000000000000000000000000000000000000000000000000000000062f660130000000000000000000000000000000000000000000000000000000000001d4c0000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001c96040adebbe79c72c75b250be268097a6363fdfa0e1d9c0dde6a147311a4edbd063ce04564f3a3bf874fec5aa000644d49631154bb1d407fdf22461fb2f84a8d0000000000000000000000000000000000000000000000000000000000000000`
  //   }]
  // );

  // console.log('purchase tx3...: ', tx3.hash);
});

// ========================================================
// TODO: make sure nftBuyer (contract1) is set in profile Auction
// TODO: make sure nftGenesisStake (contract2) is set in profile Auction
// ========================================================

// Step 3 NftMarketplace
task("deploy:3").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
  const NftTransferProxy = await hre.ethers.getContractFactory("NftTransferProxy");
  const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
  const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");
  const ValidationLogic = await hre.ethers.getContractFactory("ValidationLogic");
  const MarketplaceEvent = await hre.ethers.getContractFactory("MarketplaceEvent");

  const deployedNftTransferProxy = await hre.upgrades.deployProxy(NftTransferProxy, { kind: "uups" });
  console.log(chalk.green("nftTransferProxy: ", deployedNftTransferProxy.address));

  const deployedERC20TransferProxy = await hre.upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedERC20TransferProxy: ", deployedERC20TransferProxy.address));

  const deployedCryptoKittyTransferProxy = await hre.upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedCryptoKittyTransferProxy: ", deployedCryptoKittyTransferProxy.address));

  const deployedValidationLogic = await hre.upgrades.deployProxy(ValidationLogic, { kind: "uups" });
  console.log(chalk.green("deployedValidationLogic: ", deployedValidationLogic.address));

  const deployedMarketplaceEvent = await hre.upgrades.deployProxy(MarketplaceEvent, { kind: "uups" });
  console.log(chalk.green("deployedMarketplaceEvent: ", deployedMarketplaceEvent.address));

  const deployedNftMarketplace = await hre.upgrades.deployProxy(
    NftMarketplace,
    [
      deployedNftTransferProxy.address,
      deployedERC20TransferProxy.address,
      deployedCryptoKittyTransferProxy.address,
      (await getTokens(hre)).deployedNftBuyer,
      (await getTokens(hre)).deployedNftTokenAddress,
      deployedValidationLogic.address,
      deployedMarketplaceEvent.address,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  await deployedMarketplaceEvent.setMarketPlace(deployedNftMarketplace.address);

  await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).wethAddress, true);
  console.log(chalk.green("whitelisted WETH: ", (await getTokens(hre)).wethAddress));
  await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).usdcAddress, true);
  console.log(chalk.green("whitelisted USDC: ", (await getTokens(hre)).usdcAddress));
  await deployedNftMarketplace.modifyWhitelist((await getTokens(hre)).deployedNftTokenAddress, true);
  console.log(chalk.green("whitelisted NftToken: ", (await getTokens(hre)).deployedNftTokenAddress));

  // add operator being the marketplace
  await deployedNftTransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  console.log(chalk.green("finished deploying nft marketplace contracts!"));

  console.log(chalk.green("verifying..."));
  await getImplementation("deployedNftTransferProxy", deployedNftTransferProxy.address, hre);
  await getImplementation("deployedERC20TransferProxy", deployedERC20TransferProxy.address, hre);
  await getImplementation("deployedCryptoKittyTransferProxy", deployedCryptoKittyTransferProxy.address, hre);
  await getImplementation("deployedValidationLogic", deployedValidationLogic.address, hre);
  await getImplementation("deployedMarketplaceEvent", deployedMarketplaceEvent.address, hre);
  await getImplementation("deployedNftMarketplace", deployedNftMarketplace.address, hre);
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

  const upgradedNftProfile = await hre.upgrades.upgradeProxy("0x734a14f4df41f2fA90f8bF7fb7Ce3E2ab68d9cF0", NftProfile);
  console.log(chalk.green("upgradedNftProfile: ", upgradedNftProfile.address));

  await delayedVerifyImp("upgradedNftProfile", upgradedNftProfile.address, hre);
});

task("upgrade:NftMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");

  const upgradedNftMarketplace = await hre.upgrades.upgradeProxy(
    "0xA3509a064A54a7a60Fc4Db0245ef44F812f439f6",
    NftMarketplace,
  );
  console.log(chalk.green("upgraded nft marketplace: ", upgradedNftMarketplace.address));
  await delayedVerifyImp("upgradedNftMarketplace", upgradedNftMarketplace.address, hre);
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

  const GenesisKey = await hre.ethers.getContractFactory(network === "goerli" ? "GenesisKeyOld" : "GenesisKey");

  const upgradedGenesisKey = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedGenesisKeyAddress,
    GenesisKey,
  );
  console.log(chalk.green("upgraded genesis key: ", upgradedGenesisKey.address));

  await delayedVerifyImp("upgradedGenesisKey", upgradedGenesisKey.address, hre);
});

task("upgrade:NftResolver").setAction(async function (taskArguments, hre) {
  const NftResolver = await hre.ethers.getContractFactory("NftResolver");

  const upgradedNftResolver = await hre.upgrades.upgradeProxy((await getTokens(hre)).deployedNftResolver, NftResolver);
  console.log(chalk.green("upgradedNftResolver: ", upgradedNftResolver.address));

  await delayedVerifyImp("upgradedNftResolver", upgradedNftResolver.address, hre);
});

task("upgrade:ProfileAuction").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");

  const upgradedProfileAuction = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedProfileAuction,
    ProfileAuction,
  );
  console.log(chalk.green("upgraded profile auction: ", upgradedProfileAuction.address));

  await delayedVerifyImp("upgradedProfileAuction", upgradedProfileAuction.address, hre);
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
  );
  console.log(chalk.green("upgraded genesis key team claim: ", upgradedNftAggregator.address));

  await delayedVerifyImp("upgradedNftAggregator", upgradedNftAggregator.address, hre);
});
