import { task } from "hardhat/config";
import chalk from "chalk";

task("upgrade:ProfileAuction")
  .setAction(async function (taskArguments, { ethers, upgrades }) {
    const ProfileAuction1 = await ethers.getContractFactory('ProfileAuctionV1');

    await upgrades.upgradeProxy("0x7d4dDE9418f2c2d2D895C09e81155E1AB08aE236", ProfileAuction1);
  }); 

task("deploy:NFT.com")
  .setAction(async function (taskArguments, hre) {
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
    const deployedNftProfileProxy = await hre.upgrades.deployProxy(NftProfile,
        [
          "NFT.com",                          // string memory name,
          "NFT.com",                          // string memory symbol,
          "0x38E5F095e1a4Bb02c87cb56E2b204E00f3bE5f8d", //deployedNftTokenProxy.address,      // address _nftCashAddress,
          "0x2DF26b51fFCc50419e0538ccB5fD903F0cC67846" // deployedCreatorBondingCurve address
        ],
        { kind: 'uups' }
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
          coldWallet
        ],
        { kind: 'uups' }
    );

    console.log(chalk.green(`deployedProfileAuctionProxy: ${deployedProfileAuctionProxy.address}`));

    await deployedNftProfileProxy.setProfileAuction(deployedProfileAuctionProxy.address);
  });
