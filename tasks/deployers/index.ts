import { task } from "hardhat/config";
import chalk from "chalk";

task("upgrade:ProfileAuction").setAction(async function (taskArguments, { ethers, upgrades }) {
  const ProfileAuction1 = await ethers.getContractFactory("ProfileAuctionV1");

  await upgrades.upgradeProxy("0x7d4dDE9418f2c2d2D895C09e81155E1AB08aE236", ProfileAuction1);
});

task("deploy:NFTMarketplace").setAction(async function (taskArguments, hre) {
  console.log(chalk.green('deploying the marketplace contacts...'));

  const rinkebyNFT = "0x4DE2fE09Bc8F2145fE12e278641d2c93B9D4393A";
  const rinnkebyWETH = "0xc778417e063141139fce010982780140aa0cd5ab";

  const NftMarketplace = await hre.ethers.getContractFactory("NftMarketplace");
  const NftStake = await hre.ethers.getContractFactory("NftStake");
  const TransferProxy = await hre.ethers.getContractFactory("TransferProxy");
  const ERC20TransferProxy = await hre.ethers.getContractFactory("ERC20TransferProxy");
  const CryptoKittyTransferProxy = await hre.ethers.getContractFactory("CryptoKittyTransferProxy");

  const deployedNftStake = await NftStake.deploy(rinkebyNFT, rinnkebyWETH);

  console.log(chalk.green('deployedNftStake: ', deployedNftStake.address));

  const deployedTransferProxy = await hre.upgrades.deployProxy(TransferProxy, { kind: "uups" });
  console.log(chalk.green('nftTransferProxy: ', deployedTransferProxy.address));
  
  const deployedERC20TransferProxy = await hre.upgrades.deployProxy(ERC20TransferProxy, { kind: "uups" });
  console.log(chalk.green('deployedERC20TransferProxy: ', deployedERC20TransferProxy.address));

  const deployedCryptoKittyTransferProxy = await hre.upgrades.deployProxy(CryptoKittyTransferProxy, { kind: "uups" });
  console.log(chalk.green('deployedCryptoKittyTransferProxy: ', deployedCryptoKittyTransferProxy.address));

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

  console.log(chalk.green('deployedNftMarketplace: ', deployedNftMarketplace.address));

  // add operator being the marketplace
  await deployedTransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedERC20TransferProxy.addOperator(deployedNftMarketplace.address);
  await deployedCryptoKittyTransferProxy.addOperator(deployedNftMarketplace.address);

  console.log(chalk.green('finished deploying nft marketplace contracts!'));
});

task("deploy:NFT.com").setAction(async function (taskArguments, hre) {
  console.log(chalk.green(`initializing...`));

  const _numerator = 1;
  const _denominator = 1000000;

  const NftToken = await hre.ethers.getContractFactory("NftTokenV1");
  const governor = process.env.GOVERNOR_ADDRESS;
  const minter = process.env.MINTER_ADDRESS;
  const coldWallet = process.env.COLD_WALLET_ADDRESS;

  // const deployedNftTokenProxy = await hre.upgrades.deployProxy(NftToken, { kind: 'uups' });
  // console.log(chalk.green(`deployedNftTokenProxy: ${deployedNftTokenProxy.address}`));

  // const CreatorBondingCurve = await hre.ethers.getContractFactory("CreatorBondingCurve");
  // const deployedCreatorBondingCurve = await CreatorBondingCurve.deploy(_numerator, _denominator);

  // console.log(chalk.green(`deployedCreatorBondingCurve: ${deployedCreatorBondingCurve.address}`));

  // const NftProfileHelper = await hre.ethers.getContractFactory("NftProfileHelper");
  // const deployedNftProfileHelper = await NftProfileHelper.deploy();

  // console.log(chalk.green(`deployedNftProfileHelper: ${deployedNftProfileHelper.address}`));

  const NftProfile = await hre.ethers.getContractFactory("NftProfileV1");
  const deployedNftProfileProxy = await hre.upgrades.deployProxy(
    NftProfile,
    [
      "NFT.com", // string memory name,
      "NFT.com", // string memory symbol,
      "0x38E5F095e1a4Bb02c87cb56E2b204E00f3bE5f8d", //deployedNftTokenProxy.address,      // address _nftCashAddress,
      "0x2DF26b51fFCc50419e0538ccB5fD903F0cC67846", // deployedCreatorBondingCurve address
    ],
    { kind: "uups" },
  );

  console.log(chalk.green(`deployedNftProfileProxy: ${deployedNftProfileProxy.address}`));

  const ProfileAuction = await hre.ethers.getContractFactory("ProfileAuctionV1");
  const deployedProfileAuctionProxy = await hre.upgrades.deployProxy(
    ProfileAuction,
    [
      "0x38E5F095e1a4Bb02c87cb56E2b204E00f3bE5f8d", //deployedNftTokenProxy.address,
      minter,
      deployedNftProfileProxy.address,
      governor,
      "0xa662519951b838557684febA3d38eBEbFF4aAa54", // deployedNftProfileHelper.address,
      coldWallet,
    ],
    { kind: "uups" },
  );

  console.log(chalk.green(`deployedProfileAuctionProxy: ${deployedProfileAuctionProxy.address}`));

  await deployedNftProfileProxy.setProfileAuction(deployedProfileAuctionProxy.address);
});
