import { task } from "hardhat/config";
import chalk from "chalk";
import csv from "csvtojson";
import fs from "fs";
import delay from "delay";
import { parseBalanceMap } from "../../test/utils/parse-balance-map";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

const UNI_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const TIME_DELAY = 20000; // 20 seconds

const getTokens = async (hre: any) => {
  const chainId = hre.network.config.chainId;
  const network = chainId === 4 ? "rinkeby" : chainId === 1 ? "mainnet" : chainId;

  const governor =
    network === "rinkeby"
      ? "0x59495589849423692778a8c5aaCA62CA80f875a4"
      : network === "mainnet"
      ? "0x19942318a866606e1CC652644186A4e1f9c34277"
      : "";
  const wethAddress =
    network === "rinkeby"
      ? "0xc778417e063141139fce010982780140aa0cd5ab"
      : network === "mainnet"
      ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
      : "";
  const usdcAddress =
    network === "rinkeby"
      ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      : network === "mainnet"
      ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      : "";
  const deployedNftTokenAddress =
    network == "rinkeby"
      ? "0xBB67d85a69FCB6a200439E15e2E2c53Cfb6b0680"
      : network === "mainnet"
      ? "0x8C42428a747281B03F10C80e978C107D4d85E37F"
      : "";
  const deployedVestingAddress =
    network == "rinkeby"
      ? "0x1DD4121DA7dbA0266726f211BA006210CA111F5E"
      : network === "mainnet"
      ? "0xE13d298F713bFFd40D011e577AeBE7F31260E5Fa"
      : "";
  const deployedGenesisKeyAddress =
    network == "rinkeby" ? "0x20FC7ad1eE47245F0FEE579E1F4bEb2dC5380068" : network === "mainnet" ? "" : "";
  const genesisKeyTeamDistributorAddress =
    network == "rinkeby" ? "0x3Acb935D800c3a11c64b0E3e509C673F1bff4C0E" : network === "mainnet" ? "" : "";
  const profileMetadataLink = `https://${
    network === "rinkeby" ? "staging-api" : network === "mainnet" ? "prod-api" : ""
  }.nft.com/uri/`;
  const deployedNftBuyer =
    network == "rinkeby" ? "0x1823c26FC21f124BB61256420000C3B531BF1D40" : network === "mainnet" ? "" : "";
  const ipfsHash =
    network == "rinkeby"
      ? "ipfs://QmdzBQBCoFxkrtkh3gkQ6U59VmvwEh4c6VUf7LHyYjqqBL/"
      : network == "mainnet"
      ? "ipfs://{insert}/"
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

// TODO: update deployedNftToken NOW

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

// TODO: update deployedVesting NOW

const Schedule = {
  MONTHLY: 0,
  QUARTERLY: 1,
};

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

task("init:deliver").setAction(async function (taskArguments, hre) {
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const deployedVesting = await Vesting.attach((await getTokens(hre)).deployedVestingAddress);

  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.attach((await getTokens(hre)).deployedNftTokenAddress);

  await deployedNftToken.approve(
    deployedVesting.address,
    hre.ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
  );

  try {
    const jsonCSV = await csv().fromFile("./randomVesting.csv");
    const address = jsonCSV.map(row => row.Address);
    const amount = jsonCSV.map(row => row.Amount);
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
  const symbol = "NFTKEY";
  const auctionSeconds = "604800"; // seconds in 1 week
  const multiSig = (await getTokens(hre)).governor;
  const randomTeamAssignBool = true;

  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const deployedGenesisKey = await hre.upgrades.deployProxy(
    GenesisKey,
    [
      name,
      symbol,
      (await getTokens(hre)).wethAddress,
      multiSig,
      auctionSeconds,
      randomTeamAssignBool,
      (await getTokens(hre)).ipfsHash,
    ],
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

  // (joey)
  // (jonathan)
  // (kent)
  // (john)
  // (john)
  // (eddie)
  // (gavin)
  // (anthony)
  const insiderGKClaimJSON = JSON.parse(`{
    "0xBD3Feab37Eb7533B03bf77381D699aD8bA64A30B": "1",
    "0x643367af2Ae07EBFbDE7599eB0855A19c24dca5F": "1",
    "0x2f8ECC5A549638630C094a3DB3849f1ba27C31B1": "1",
    "0x98375cB9Dc4a14b46a4C8b284880C7C277f4c8bc": "1",
    "0x948c21e4e9e342e083424b6132fc29644c6c0a9f": "1",
    "0x341dE5B426d3582f35357094Ae412cf4E41774Cd": "1",
    "0x338eFdd45AE7D010da108f39d293565449C52682": "1",
    "0xF968EC896Ffcb78411328F9EcfAbB9FcCFe4E863": "1"
  }`);

  const merkleResultInsider = parseBalanceMap(insiderGKClaimJSON);
  const merkleRootInsider = merkleResultInsider.merkleRoot;
  await deployedGenesisKeyTeamDistributor.changeMerkleRoot(merkleRootInsider);
  const insiderJSON = JSON.stringify(merkleResultInsider, null, 2);
  fs.writeFileSync(`./tasks/merkle/gkInsider/rinkeby-${new Date()}.json`, insiderJSON);
  console.log(`saved merkle gkInsider rinkeby`);

  console.log(chalk.green("merkleRootInsider: ", merkleRootInsider));
  console.log(chalk.green("deployedGenesisKeyTeamDistributor: ", deployedGenesisKeyTeamDistributor.address));
});

task("deploy:1c").setAction(async function (taskArguments, hre) {
  // general whitelist winners ========================================================================================
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const deployedGenesisKeyContract = await GenesisKey.attach((await getTokens(hre)).deployedGenesisKeyAddress);

  // TODO:
  const genesisWhitelistWinnerJSON = JSON.parse(`{
    "0x59495589849423692778a8c5aaCA62CA80f875a4": "1",
    "0xBb6113fb407DD8156a2dc1eE7246b86cA0b510ed": "1",
    "0x511aA45406238B3366A0b2aCFBef9d5f5A77f382": "1",
    "0x5c09f8b380140E40A4ADc744F9B199a9383553F9": "1",
    "0x74bB476C99d2fad476DB75654e58404Db6EC4977": "1",
    "0xf9142440D22CE022b5d88062a0b0dce0149e5F65": "1",
    "0xfA3ccA6a31E30Bf9A0133a679d33357bb282c995": "1",
    "0x56a065dFEB4616f89aD733003914A8e11dB6CEdD": "1",
    "0xC478BEc40f863DE406f4B87490011944aFB9Aa27": "1",
    "0xAe51b702Ee60279307437b13734D27078EF108AA": "1",
    "0x2b9EE94612b9e038909471600e11993D5624eC42": "1",
    "0xD8D46690Db9534eb3873aCf5792B8a12631D8229": "1",
    "0x9f76C103788c520dCb6fAd09ABd274440b8D026D": "1"
  }`);

  // TODO:
  const wethMin = hre.ethers.BigNumber.from("3000000000000000");

  // merkle result is what you need to post publicly and store on FE
  const merkleResult = parseBalanceMap(genesisWhitelistWinnerJSON);
  const { merkleRoot } = merkleResult;

  const GenesisKeyDistributor = await hre.ethers.getContractFactory("GenesisKeyDistributor");
  const deployedGenesisKeyDistributor = await GenesisKeyDistributor.deploy(
    (
      await getTokens(hre)
    ).deployedGenesisKeyAddress,
    merkleRoot,
    wethMin,
  );

  console.log(chalk.green("merkleResult: ", merkleResult));

  const json = JSON.stringify(merkleResult, null, 2);
  fs.writeFileSync(`./tasks/merkle/gk/rinkeby-${new Date()}.json`, json);
  console.log(`saved merkle gk rinkeby`);

  console.log(chalk.green("merkleRoot: ", merkleRoot));
  console.log(chalk.green("deployedGenesisKeyDistributor: ", deployedGenesisKeyDistributor.address));
  await deployedGenesisKeyContract.setGenesisKeyMerkle(deployedGenesisKeyDistributor.address);

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await verifyContract(
    "deployedGenesisKeyDistributor",
    deployedGenesisKeyDistributor.address,
    [(await getTokens(hre)).deployedGenesisKeyAddress, merkleRoot, wethMin.toString()],
    hre,
  );
});

// STEP 2 deploy:NFT.com
task("deploy:2").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));
  // NFT TOKEN ========================================================================================
  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.attach((await getTokens(hre)).deployedNftTokenAddress);

  // NFT GENESIS KEY STAKE ============================================================================
  const GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
  const deployedNftGenesisStake = await GenesisStake.deploy(
    deployedNftToken.address,
    (
      await getTokens(hre)
    ).deployedGenesisKeyAddress,
  );
  console.log(chalk.green(`deployedNftGenesisStake: ${deployedNftGenesisStake.address}`));

  // NftProfileHelper =================================================================================
  const NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
  const deployedNftProfileHelper = await NftProfileHelper.deploy();
  console.log(chalk.green(`deployedNftProfileHelper: ${deployedNftProfileHelper.address}`));

  // NFT PROFILE ======================================================================================
  const NftProfile = await hre.ethers.getContractFactory("NftProfile");
  const deployedNftProfileProxy = await hre.upgrades.deployProxy(
    NftProfile,
    [
      "NFT.com", // string memory name,
      "NFT.com", // string memory symbol,
      deployedNftToken.address,
      (await getTokens(hre)).profileMetadataLink,
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedNftProfileProxy: ${deployedNftProfileProxy.address}`));

  // NFT BUYER ========================================================================================
  const NftBuyer = await hre.ethers.getContractFactory("NftBuyer");
  const deployedNftBuyer = await NftBuyer.deploy(
    UNI_V2_FACTORY,
    deployedNftGenesisStake.address,
    deployedNftToken.address,
    (
      await getTokens(hre)
    ).wethAddress,
  );
  console.log(chalk.green(`deployedNftBuyer: ${deployedNftBuyer.address}`));

  // PROFILE AUCTION =================================================================================
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");
  const deployedProfileAuction = await hre.upgrades.deployProxy(
    ProfileAuction,
    [
      deployedNftToken.address,
      deployedNftProfileProxy.address,
      (await getTokens(hre)).governor,
      deployedNftProfileHelper.address,
      deployedNftBuyer.address,
      (await getTokens(hre)).deployedGenesisKeyAddress,
      deployedNftGenesisStake.address,
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedProfileAuction: ${deployedProfileAuction.address}`));
  await deployedNftProfileProxy.setProfileAuction(deployedProfileAuction.address);

  // VERIFICATION =====================================================================================
  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  await verifyContract(
    "deployedNftGenesisStake",
    deployedNftGenesisStake.address,
    [deployedNftToken.address, (await getTokens(hre)).deployedGenesisKeyAddress],
    hre,
  );
  await verifyContract("deployedNftProfileHelper", deployedNftProfileHelper.address, [], hre);

  await getImplementation("deployedNftProfile", deployedNftProfileProxy.address, hre);

  await verifyContract(
    "deployedNftBuyer",
    deployedNftBuyer.address,
    [UNI_V2_FACTORY, deployedNftGenesisStake.address, deployedNftToken.address, (await getTokens(hre)).wethAddress],
    hre,
  );

  await getImplementation("deployedProfileAuction", deployedProfileAuction.address, hre);
});

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

  // TODO: use right address
  const nftToken = "";

  // merkle result is what you need to post publicly and store on FE
  const merkleResult = parseBalanceMap(jsonInput);
  const { merkleRoot } = merkleResult;

  const MerkleDistributor = await hre.ethers.getContractFactory("MerkleDistributor");

  const deployedNftTokenAirdrop = await MerkleDistributor.deploy(nftToken, merkleRoot);
  console.log(chalk.green(`deployedNftTokenAirdrop: ${deployedNftTokenAirdrop.address}`));

  console.log(chalk.green(`${TIME_DELAY / 1000} second delay`));
  await delay(TIME_DELAY);
  console.log(chalk.green("verifying..."));
  await verifyContract("deployedNftTokenAirdrop", deployedNftTokenAirdrop.address, [nftToken, merkleRoot], hre);
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

task("upgrade:ProfileAuction").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");

  const upgradedProfileAuction = await hre.upgrades.upgradeProxy(
    "0x386B1a1C8Bc6d3Ca3cF66f15f49742a9a2840CA2",
    ProfileAuction,
  );
  console.log(chalk.green("upgraded profile auction: ", upgradedProfileAuction.address));

  await delayedVerifyImp("upgradedProfileAuction", upgradedProfileAuction.address, hre);
});

task("upgrade:Vesting").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const vestingAddress = "0x058069538D35B3037bA373b3CAb9adc8e2388AdF";

  const upgradedVesting = await hre.upgrades.upgradeProxy(vestingAddress, Vesting);
  console.log(chalk.green("upgraded vesting: ", upgradedVesting.address));

  await delayedVerifyImp("upgradedVesting", vestingAddress, hre);
});

task("upgrade:GenesisKey").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

  const upgradedGenesisKey = await hre.upgrades.upgradeProxy(
    (
      await getTokens(hre)
    ).deployedGenesisKeyAddress,
    GenesisKey,
  );
  console.log(chalk.green("upgraded genesis key: ", upgradedGenesisKey.address));

  await delayedVerifyImp("upgradedGenesisKey", upgradedGenesisKey.address, hre);
});

// TODO: script for gnosis upgrade
// console.log("Preparing upgrade...");
// const boxV2Address = await hre.upgrades.prepareUpgrade(proxyAddress, BoxV2);
// console.log("BoxV2 at:", boxV2Address);
