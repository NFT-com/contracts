const { expect } = require("chai");
const { sign, getDigest, getHash, ERC20_PERMIT_TYPEHASH } = require("./utils/sign-utils");

describe("template", function () {
  try {
    let NftToken, NftStake;
    let deployedNftToken, deployedNftStake;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    beforeEach(async function () {
      // Get the ContractFactory and Signers here.
      [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
      

      NftToken = await ethers.getContractFactory("NftToken");
      deployedNftToken = await NftToken.deploy(); // mint 10B tokens

      NftStake = await ethers.getContractFactory("NftStake");
      deployedNftStake = await NftStake.deploy(deployedNftToken.address);
    });

    describe("Test Staking and Unstaking", function () {
        it("deployment should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await deployedNftToken.balanceOf(owner.address);
            expect(await deployedNftToken.totalSupply()).to.equal(ownerBalance);
        });

        it("should allow users to increase allowance with permit", async function () {    
            const testUser = ethers.Wallet.createRandom();

            const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
            let deadline = currentTime + 100;
            const nftTokenPermitDigest = await getDigest(
                ethers.provider,
                "NFT.com",
                deployedNftToken.address,
                getHash(
                    ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
                    [ERC20_PERMIT_TYPEHASH, testUser.address, deployedNftStake.address, 1000, 0, deadline]
                )
            );

            expect(await deployedNftToken.balanceOf(testUser.address)).to.be.equal(0);

            await deployedNftToken.connect(owner).transfer(testUser.address, 10000);

            expect(await deployedNftToken.balanceOf(testUser.address)).to.be.equal(10000);
            expect(await deployedNftToken.allowance(testUser.address, deployedNftStake.address)).to.be.equal(0);

            const { v: v0, r: r0, s: s0 } = sign(nftTokenPermitDigest, testUser);

            await deployedNftToken.permit(testUser.address, deployedNftStake.address, 1000, deadline, v0, r0, s0);
            expect(await deployedNftToken.allowance(testUser.address, deployedNftStake.address)).to.be.equal(1000);
        });
    });
  } catch (err) {
    console.log("error: ", err);
  }
});
