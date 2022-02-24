import { task } from "hardhat/config";
import chalk from "chalk";

task("upgrade:ProfileAuction").setAction(async function (taskArguments, { ethers, upgrades }) {
  const ProfileAuction = await ethers.getContractFactory("ProfileAuction");

  await upgrades.upgradeProxy("0x7d4dDE9418f2c2d2D895C09e81155E1AB08aE236", ProfileAuction);
});

task("deploy:NFTMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green("deploying the marketplace contacts..."));

  const rinkebyNFT = "0xa75F995f252ba5F7C17f834b314201271d32eC35";
  const rinkebyWETH = "0xc778417e063141139fce010982780140aa0cd5ab";
  const rinkebyGenKey = "0x9F6ED3d90D48573245d6a0c0742db4eCf27B6a56";

  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
  const NftStake = await hre.ethers.getContractFactory("PublicNftStake");
  const GenesisNftStake = await hre.ethers.getContractFactory("GenesisNftStake");
  const TransferProxy = await hre.ethers.getContractFactory("TransferProxy");
  const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
  const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");

  const deployedNftStake = await NftStake.deploy(rinkebyNFT, rinkebyWETH);
  console.log(chalk.green("deployedNftStake: ", deployedNftStake.address));

  const deployedGenStake = await GenesisNftStake.deploy(
    rinkebyNFT,
    rinkebyWETH,
    rinkebyGenKey
  );
  console.log(chalk.green("deployedGenStake: ", deployedGenStake.address));

  const deployedTransferProxy = await hre.upgrades.deployProxy(TransferProxy, { kind: "uups" });
  console.log(chalk.green("nftTransferProxy: ", deployedTransferProxy.address));

  const deployedERC20TransferProxy = await hre.upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedERC20TransferProxy: ", deployedERC20TransferProxy.address));

  const deployedCryptoKittyTransferProxy = await hre.upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });
  console.log(chalk.green("deployedCryptoKittyTransferProxy: ", deployedCryptoKittyTransferProxy.address));

  const deployedNftMarketplace = await hre.upgrades.deployProxy(
    NftMarketplace,
    [
      deployedTransferProxy.address,                  
      deployedERC20TransferProxy.address,                 
      deployedCryptoKittyTransferProxy.address,                 
      deployedNftStake.address,                 
    ],
    { kind: "uups" },
  );

  console.log(chalk.green("deployedNftMarketplace: ", deployedNftMarketplace.address));

  // add operator being the marketplace
  await deployedTransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  console.log(chalk.green("finished deploying nft marketplace contracts!"));
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

task("deploy:GenKey").setAction(async function (taskArguments, hre) {
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");

  const name = "NFT.com Genesis Key";
  const symbol = "NFTKEY";
  const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
  const multiSig = "0x59495589849423692778a8c5aaCA62CA80f875a4"; // testnet deployer
  const auctionSeconds = "604800"; // seconds in 1 week

  const deployedGenKey = await hre.upgrades.deployProxy(
    GenesisKey,
    [name, symbol, wethAddress, multiSig, auctionSeconds],
    { kind: "uups" },
  );
  console.log(chalk.green("deployedGenKey: ", deployedGenKey.address));
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

task("deploy:GenesisKey").setAction(async function (taskArguments, hre) {
  const GenesisKey = await hre.ethers.getContractFactory("GenesisKey");
  const governor = process.env.GOVERNOR_ADDRESS;

  const name = "NFT.com Genesis Key";
  const symbol = "NFTKEY";
  const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
  const auctionSeconds = "604800"; // seconds in 1 week
  const multiSig = governor;

  const deployedGenesisKey = await hre.upgrades.deployProxy(
    GenesisKey,
    [name, symbol, wethAddress, multiSig, auctionSeconds],
    { kind: "uups" },
  );

  console.log(chalk.green(`deployedGenesisKey: ${deployedGenesisKey.address}`));
});

task("deploy:NFT.com").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));

  const NftToken = await hre.ethers.getContractFactory("NftToken");
  const governor = process.env.GOVERNOR_ADDRESS;
  const minter = process.env.MINTER_ADDRESS;
  const coldWallet = process.env.COLD_WALLET_ADDRESS;
  const wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby weth
  const deployedGenesisKeyAddress = ""; // TODO: fill in after genesis key is done

  const GenesisStake = await hre.ethers.getContractFactory("GenesisNftStake");
  const NftStake = await hre.ethers.getContractFactory("PublicNftStake");

  const deployedNftToken = await NftToken.deploy();
  console.log(chalk.green(`deployedNftToken: ${deployedNftToken.address}`));

  const deployedNftGenesisStake = await GenesisStake.deploy(
    deployedNftToken.address,
    wethAddress,
    deployedGenesisKeyAddress,
  );

  console.log(chalk.green(`deployedNftGenesisStake: ${deployedNftGenesisStake.address}`));

  const deployedNftStake = await NftStake.deploy(deployedNftToken.address, wethAddress);

  console.log(chalk.green(`deployedNftStake: ${deployedNftStake.address}`));

  const NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
  const deployedNftProfileHelper = await NftProfileHelper.deploy();

  console.log(chalk.green(`deployedNftProfileHelper: ${deployedNftProfileHelper.address}`));

  const NftProfile = await hre.ethers.getContractFactory("NftProfile");
  const deployedNftProfileProxy = await hre.upgrades.deployProxy(
    NftProfile,
    [
      "NFT.com", // string memory name,
      "NFT.com", // string memory symbol,
      deployedNftToken.address, // address _nftCashAddress,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green(`deployedNftProfileProxy: ${deployedNftProfileProxy.address}`));

  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuctionV2");
  const deployedProfileAuctionProxy = await hre.upgrades.deployProxy(
    ProfileAuction,
    [
      deployedNftToken.address,
      minter,
      deployedNftProfileProxy.address,
      governor,
      deployedNftProfileHelper.address,
      coldWallet,
      deployedGenesisKeyAddress,
      deployedNftGenesisStake.address,
      deployedNftStake.address,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green(`deployedProfileAuctionProxy: ${deployedProfileAuctionProxy.address}`));

  await deployedNftProfileProxy.setProfileAuction(deployedProfileAuctionProxy.address);
});
