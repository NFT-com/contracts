import { task } from "hardhat/config";
import chalk from "chalk";
import fs from "fs";
import { parseBalanceMap } from "../../test/utils/parse-balance-map";

const network = "rinkeby";
const governor = "0x59495589849423692778a8c5aaCA62CA80f875a4"; // TODO: UPDATE
const wethAddress =
  network === "rinkeby" ? "0xc778417e063141139fce010982780140aa0cd5ab" : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const UNI_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

// STEP 1 (deploy:GenesisKey)
task("deploy:1").setAction(async function (taskArguments, hre) {
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

// gen key whitelist claim
task("deploy:1b").setAction(async function (taskArguments, hre) {
  // TODO:
  const deployedGenesisKey = "0xbEeB7221B6058B9529e0bde13A072f17c63CD372";
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const deployedGenesisKeyContract = await GenesisKey.attach(deployedGenesisKey);

  // TODO:
  const jsonInput = JSON.parse(`{
    "0x59495589849423692778a8c5aaCA62CA80f875a4": "1",
    "0x2b9EE94612b9e038909471600e11993D5624eC42": "2",
    "0x0f33d6F1d69f87E5494cBfCAC9B9A3619f38Ca09": "3",
    "0x9B733736A14C8f5483A54278349A25d3D174226d": "4"
  }`);

  // TODO:
  const wethMin = hre.ethers.BigNumber.from(Number(10 ** 16).toString());

  // merkle result is what you need to post publicly and store on FE
  const merkleResult = parseBalanceMap(jsonInput);
  const { merkleRoot } = merkleResult;

  const GenesisKeyDistributor = await hre.ethers.getContractFactory("GenesisKeyDistributor");
  const deployedGenesisKeyDistributor = await GenesisKeyDistributor.deploy(deployedGenesisKey, merkleRoot, wethMin);

  console.log(chalk.green("merkleResult: ", merkleResult));

  const json = JSON.stringify(merkleResult, null, 2);
  fs.writeFileSync(`./tasks/merkle/gk/rinkeby-${new Date()}.json`, json);
  console.log(`saved merkle gk rinkeby`);

  console.log(chalk.green("merkleRoot: ", merkleRoot));
  console.log(chalk.green("deployedGenesisKeyDistributor: ", deployedGenesisKeyDistributor.address));
  await deployedGenesisKeyContract.setGenesisKeyMerkle(deployedGenesisKeyDistributor.address);
});

// STEP 2 deploy:NFT.com
task("deploy:2").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));
  const deployedGenesisKeyAddress = "0xbEeB7221B6058B9529e0bde13A072f17c63CD372"; // TODO: fill in after genesis key is done

  // NFT TOKEN ========================================================================================
  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const deployedNftToken = await NftToken.deploy();
  console.log(chalk.green(`deployedNftToken: ${deployedNftToken.address}`));

  // NFT GENESIS KEY STAKE ============================================================================
  const GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
  const deployedNftGenesisStake = await GenesisStake.deploy(deployedNftToken.address, deployedGenesisKeyAddress);
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

// Step 3 NftMarketplace
task("deploy:3").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const rinkebyNFT = "0xBe1BF67300A8c28F805f0399513885D290cA99F7";
  const deployedNftBuyer = "0xD5e0CEA10321287d6cb70E12dCAd6DCa0Bec8cF8";

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
      deployedNftBuyer,
      rinkebyNFT,
      deployedValidationLogic.address,
      deployedMarketplaceEvent.address,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  await deployedMarketplaceEvent.setMarketPlace(deployedNftMarketplace.address);

  // add operator being the marketplace
  await deployedNftTransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  console.log(chalk.green("finished deploying nft marketplace contracts!"));
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
});

// UPGRADES ============================================================================================
task("upgrade:NftProfile").setAction(async function (taskArguments, { ethers, upgrades }) {
  const NftProfile = await ethers.getContractFactory("NftProfile");

  const upgradedNftProfile = await upgrades.upgradeProxy("0xaa7F30a10D3E259ae9B14308C77dFe5aA2f5D9Df", NftProfile);
  console.log(chalk.green("upgradedNftProfile: ", upgradedNftProfile.address));
});

task("upgrade:NftMarketplace").setAction(async function (taskArguments, hre) {
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
  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuction");

  const upgradedProfileAuction = await hre.upgrades.upgradeProxy(
    "0xc53884b5E8B9f29635D865FBBccFd7Baf103B6eC",
    ProfileAuction,
  );
  console.log(chalk.green("upgraded profile auction: ", upgradedProfileAuction.address));
});

task("upgrade:GenesisKey").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("starting to upgrade..."));
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

  const upgradedGenesisKey = await hre.upgrades.upgradeProxy("0xbEeB7221B6058B9529e0bde13A072f17c63CD372", GenesisKey);
  console.log(chalk.green("upgraded genesis key: ", upgradedGenesisKey.address));
});
