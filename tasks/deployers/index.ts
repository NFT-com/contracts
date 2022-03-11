import { task } from "hardhat/config";
import chalk from "chalk";
import { parseBalanceMap, parseBalanceMapKey } from "../../test/utils/parse-balance-map";

const network = "rinkeby";
const governor = "0x59495589849423692778a8c5aaCA62CA80f875a4"; // TODO: UPDATE
const wethAddress =
  network === "rinkeby" ? "0xc778417e063141139fce010982780140aa0cd5ab" : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNI_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

// STEP 1
task("deploy:GenesisKey").setAction(async function (taskArguments, hre) {
  const name = "NFT.com Genesis Key";
  const symbol = "NFTKEY";
  const auctionSeconds = "604800"; // seconds in 1 week
  const multiSig = governor;

  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const deployedGenesisKey = await hre.upgrades.deployProxy(
    GenesisKey,
    [name, symbol, wethAddress, multiSig, auctionSeconds],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedGenesisKey: ${deployedGenesisKey.address}`));
});

// STEP 2
task("deploy:NFT.com").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));
  const deployedGenesisKeyAddress = "0xb5815c46D262005C170576330D0FB27d018fAd60"; // TODO: fill in after genesis key is done

  // NFT TOKEN ========================================================================================
  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.deploy();
  console.log(chalk.green(`deployedNftToken: ${deployedNftToken.address}`));

  // GENESIS KEY STAKE ================================================================================
  const GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
  const deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKeyAddress);
  console.log(chalk.green(`deployedNftGenesisStake: ${deployedNftGenesisStake.address}`));

  // PUBLIC STAKE =====================================================================================
  const NftStake = await hre.ethers.getContractFactory("PublicNftStake");
  const deployedNftStake = await NftStake.deploy(deployedNftToken.address);
  console.log(chalk.green(`deployedNftStake: ${deployedNftStake.address}`));

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
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedNftProfileProxy: ${deployedNftProfileProxy.address}`));

  // NFT BUYER ========================================================================================
  const NftBuyer = await hre.ethers.getContractFactory("NftBuyer");
  const deployedNftBuyer = await NftBuyer.deploy(
    UNI_V2_FACTORY,
    deployedNftStake.address,
    deployedNftGenesisStake.address,
    deployedNftToken.address,
    wethAddress,
  );
  console.log(chalk.green(`deployedNftBuyer: ${deployedNftBuyer.address}`));

  // PROFILE AUCTION =================================================================================
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");
  const deployedProfileAuction = await hre.upgrades.deployProxy(
    ProfileAuction,
    [
      deployedNftToken.address,
      deployedNftProfileProxy.address,
      governor,
      deployedNftProfileHelper.address,
      deployedNftBuyer.address,
      deployedGenesisKeyAddress,
      deployedNftGenesisStake.address,
    ],
    { kind: "uups" },
  );
  console.log(chalk.green(`deployedProfileAuction: ${deployedProfileAuction.address}`));
});

// Step 3
task("deploy:ProfileMerkle").setAction(async function (taskArguments, hre) {
  const deployedProfileAuction = ""; // TODO:

  // Profile Distributor Merkle ========================================================================
  // TODO: add in correct JSON mapping
  const jsonInput = JSON.parse(`{
    "gavin": "1",
    "boled": "1",
    "satoshi": "2"
  }`);

  // merkle result is what you need to post publicly and store on FE
  const merkleResult = parseBalanceMapKey(jsonInput);
  const { merkleRoot } = merkleResult;

  const MerkleDistributorProfile = await hre.ethers.getContractFactory("MerkleDistributorProfile");
  const deployedMerkleDistributorProfile = await MerkleDistributorProfile.deploy(deployedProfileAuction, merkleRoot);
  console.log(chalk.green(`deployedMerkleDistributorProfile: ${deployedMerkleDistributorProfile.address}`));

  // TODO: make sure this is executed by multisig
  // await deployedProfileAuction.setMerkleDistributor(deployedMerkleDistributorProfile.address);
});

// Step 4
task("deploy:NftMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const rinkebyNFT = "0xa75F995f252ba5F7C17f834b314201271d32eC35";
  const deployedNftBuyer = "0xe2d257DD0c8989aD30963633120ff35055B1fB62";

  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
  const NftTransferProxy = await hre.ethers.getContractFactory("NftTransferProxy");
  const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
  const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");

  const deployedNftTransferProxy = await hre.upgrades.deployProxy(NftTransferProxy, { kind: "uups" });
  console.log(chalk.green("nftTransferProxy: ", deployedNftTransferProxy.address));

  const deployedERC20TransferProxy = await hre.upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedERC20TransferProxy: ", deployedERC20TransferProxy.address));

  const deployedCryptoKittyTransferProxy = await hre.upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedCryptoKittyTransferProxy: ", deployedCryptoKittyTransferProxy.address));

  const deployedNftMarketplace = await hre.upgrades.deployProxy(
    NftMarketplace,
    [
      deployedNftTransferProxy.address,
      deployedERC20TransferProxy.address,
      deployedCryptoKittyTransferProxy.address,
      deployedNftBuyer,
      rinkebyNFT,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  // add operator being the marketplace
  await deployedNftTransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  console.log(chalk.green("finished deploying nft marketplace contracts!"));
});

// STEP 5 (wait until ready)
task("deploy:Airdrop").setAction(async function (taskArguments, hre) {
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
});

// UPGRADES ============================================================================================

task("upgrade:ProfileAuction").setAction(async function (taskArguments, { ethers, upgrades }) {
  const ProfileAuction = await ethers.getContractFactory("ProfileAuction");

  await upgrades.upgradeProxy("0x7d4dDE9418f2c2d2D895C09e81155E1AB08aE236", ProfileAuction);
});

task("upgrade:NFTMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");

  const upgradedNftMarketplace = await hre.upgrades.upgradeProxy(
    "0xA3509a064A54a7a60Fc4Db0245ef44F812f439f6",
    NftMarketplace,
  );
  console.log(chalk.green("upgraded nft marketplace: ", upgradedNftMarketplace.address));
  // console.log(chalk.green("upgradedNftMarketplace: ", JSON.stringify(upgradedNftMarketplace, null, 2)));
});

task("upgrade:ProfileAuction").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuctionV2");

  const upgradedProfileAuction = await hre.upgrades.upgradeProxy(
    "0x2295828BBB9270cF92D29ed79bA0260d64fdF23f",
    ProfileAuction,
  );
  console.log(chalk.green("upgraded profile auction: ", upgradedProfileAuction.address));
});

task("upgrade:GenesisKey").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

  const upgradedGenesisKey = await hre.upgrades.upgradeProxy("0x9F6ED3d90D48573245d6a0c0742db4eCf27B6a56", GenesisKey);
  console.log(chalk.green("upgraded profile auction: ", upgradedGenesisKey.address));
});
