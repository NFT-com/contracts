import { task } from "hardhat/config";
import chalk from "chalk";
import fs from "fs";
import { parseBalanceMap } from "../../test/utils/parse-balance-map";

const network = "rinkeby";
const governor = "0x59495589849423692778a8c5aaCA62CA80f875a4"; // TODO: UPDATE
const wethAddress =
  network === "rinkeby" ? "0xc778417e063141139fce010982780140aa0cd5ab" : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const usdcAddress =
  network === "rinkeby" ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
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
  const deployedGenesisKey = "0xAed146B7E487B2d64b51B6D27F75c1f52247050a";
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const deployedGenesisKeyContract = await GenesisKey.attach(deployedGenesisKey);

  // TODO:
  const jsonInput = JSON.parse(`{
    "0xD8D46690Db9534eb3873aCf5792B8a12631D8229": "1",
    "0x9f76C103788c520dCb6fAd09ABd274440b8D026D": "1",
    "0xC478BEc40f863DE406f4B87490011944aFB9Aa27": "1",
    "0xE65eC5f5583053FADcAF2ebA354F8592D3c2ABb9": "1",
    "0x56a065dFEB4616f89aD733003914A8e11dB6CEdD": "1",
    "0x7F04084166e1F2478B8f7a99FafBA4238c7dDA83": "1",
    "0xa18376780EB719bA2d2abb02D1c6e4B8689329e0": "1",
    "0x31EeE8EbAF0eD960537BB272071fE81CAcdDd77A": "1",
    "0xBb6113fb407DD8156a2dc1eE7246b86cA0b510ed": "1",
    "0x84EEFFB8Ed6958878Eb4a35aB33346D8aF1A01f3": "1",
    "0xfA3ccA6a31E30Bf9A0133a679d33357bb282c995": "1",
    "0x5c09f8b380140E40A4ADc744F9B199a9383553F9": "1",
    "0x090Be0f933d005EB7f30BEcF78A37B9C0DBb7442": "1",
    "0xc97F36837e25C150a22A9a5FBDd2445366F11245": "1",
    "0x59495589849423692778a8c5aaCA62CA80f875a4": "1",
    "0x34c0774DA64e53cAfC3C17710dFD55f6D2B51c7E": "1",
    "0x2b9EE94612b9e038909471600e11993D5624eC42": "1",
    "0xFC4BCb93a151F68773dA76D5D61E5f1Eea9FD494": "1",
    "0xFC4BCb93a151F68773dA76D5D61E5f1Eea9FD494": "1"
  }`);

  // TODO:
  const wethMin = hre.ethers.BigNumber.from("1000000000000000");

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
  const deployedGenesisKeyAddress = "0xAed146B7E487B2d64b51B6D27F75c1f52247050a"; // TODO: fill in after genesis key is done

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

  await deployedNftProfileProxy.setProfileAuction(deployedProfileAuction.address);
});

// Step 3 NftMarketplace
task("deploy:3").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const nftToken = "0xFD080f88e4dA08cAA35744b281481cc86b95D287";
  const deployedNftBuyer = "0xC47FA495c5DaCd88D7A5D52B8274e251c6609cf5";

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
      nftToken,
      deployedValidationLogic.address,
      deployedMarketplaceEvent.address,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  await deployedMarketplaceEvent.setMarketPlace(deployedNftMarketplace.address);

  await deployedNftMarketplace.modifyWhitelist(wethAddress, true);
  console.log(chalk.green("whitelisted WETH: ", wethAddress));
  await deployedNftMarketplace.modifyWhitelist(usdcAddress, true);
  console.log(chalk.green("whitelisted USDC: ", usdcAddress));
  await deployedNftMarketplace.modifyWhitelist(nftToken, true);
  console.log(chalk.green("whitelisted NftToken: ", nftToken));

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
