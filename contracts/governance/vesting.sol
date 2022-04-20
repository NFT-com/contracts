// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

<<<<<<< HEAD
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
=======
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

interface INft {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address dst, uint256 rawAmount) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 rawAmount
    ) external returns (bool);
}

<<<<<<< HEAD
contract Vesting is Initializable, UUPSUpgradeable {
    using SafeMathUpgradeable for uint256;

=======
contract Vesting {
    using SafeMath for uint256;

    // post 1 year cliff
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    enum VestingInstallments {
        MONTHLY,
        QUARTERLY
    }

<<<<<<< HEAD
    struct VestingInfo {
        uint256 claimedAmount;
        uint256 vestingAmount;
        uint256 vestingBegin;
        uint256 vestingCliff;
        uint256 vestingEnd;
        uint256 lastUpdate;
        VestingInstallments installment;
        bool revokedVestor;
    }

    uint256 public constant MONTH_SECONDS = 30 days; // 2592000
    uint256 public constant QUARTER_SECONDS = 91 days; // 7862400
=======
    uint256 public constant MONTH_SECONDS = 30 days;
    uint256 public constant QUARTER_SECONDS = 91 days;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

    address public nftToken;
    address public multiSig;

<<<<<<< HEAD
    mapping(address => uint256) private claimedAmount;
    mapping(address => uint256) private vestingAmount;
    mapping(address => uint256) private vestingBegin;
    mapping(address => uint256) private vestingCliff;
    mapping(address => uint256) private vestingEnd;
    mapping(address => uint256) private lastUpdate;
    mapping(address => VestingInstallments) private installment;
=======
    mapping(address => uint256) public claimedAmount;
    mapping(address => uint256) public vestingAmount;
    mapping(address => uint256) public vestingBegin;
    mapping(address => uint256) public vestingCliff;
    mapping(address => uint256) public vestingEnd;
    mapping(address => uint256) public lastUpdate;
    mapping(address => VestingInstallments) public installment;
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398

    mapping(address => bool) public initializedVestor;
    mapping(address => bool) public revokedVestor;

<<<<<<< HEAD
    event NewMultiSig(address oldMultiSig, address newMultiSig);

=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    modifier onlyMultiSig() {
        require(msg.sender == multiSig, "Vesting::onlyMultiSig: Only multisig can call this function");
        _;
    }

<<<<<<< HEAD
    function initialize(address nftToken_, address multiSig_) public initializer {
        __UUPSUpgradeable_init();

=======
    constructor(address nftToken_, address multiSig_) {
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
        nftToken = nftToken_;
        multiSig = multiSig_;
    }

<<<<<<< HEAD
    function _authorizeUpgrade(address) internal override onlyMultiSig {}

=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    function initializeVesting(
        address[] memory recipients_,
        uint256[] memory vestingAmounts_,
        uint256[] memory vestingBegins_,
        uint256[] memory vestingCliffs_,
        uint256[] memory vestingEnds_,
        VestingInstallments[] memory installments_
    ) external onlyMultiSig {
        require(
            recipients_.length == vestingAmounts_.length &&
                vestingAmounts_.length == vestingBegins_.length &&
                vestingBegins_.length == vestingCliffs_.length &&
                vestingCliffs_.length == vestingEnds_.length &&
                vestingEnds_.length == installments_.length,
            "Vesting::initializeVesting: length of all arrays must be equal"
        );

<<<<<<< HEAD
=======
        console.log("MONTH_SECONDS: ", MONTH_SECONDS);
        console.log("QUARTER_SECONDS: ", QUARTER_SECONDS);

>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
        uint256 totalAmount;
        for (uint256 i = 0; i < recipients_.length; i++) {
            address recipient_ = recipients_[i];
            uint256 vestingAmount_ = vestingAmounts_[i];
            uint256 vestingBegin_ = vestingBegins_[i];
            uint256 vestingCliff_ = vestingCliffs_[i];
            uint256 vestingEnd_ = vestingEnds_[i];
            VestingInstallments installment_ = installments_[i];

            require(recipient_ != address(0), "Vesting::initializeVesting: recipient cannot be the zero address");
            require(!initializedVestor[recipient_], "Vesting::initializeVesting: recipient already initialized");
            require(vestingCliff_ >= vestingBegin_, "Vesting::initializeVesting: cliff is too early");
            require(vestingEnd_ > vestingCliff_, "Vesting::initializeVesting: end is too early");
            require(
                installment_ == VestingInstallments.MONTHLY
                    ? vestingEnd_ - vestingBegin_ >= MONTH_SECONDS
                    : vestingEnd_ - vestingBegin_ >= QUARTER_SECONDS,
                "Vesting::initializeVesting: end is too early"
            );
            require(
                installment_ == VestingInstallments.MONTHLY || installment_ == VestingInstallments.QUARTERLY,
                "Vesting::initializeVesting: installment must be MONTHLY or QUARTERLY"
            );

            vestingAmount[recipient_] = vestingAmount_;
            vestingBegin[recipient_] = vestingBegin_;
            vestingCliff[recipient_] = vestingCliff_;
            vestingEnd[recipient_] = vestingEnd_;
            lastUpdate[recipient_] = vestingBegin_;
            installment[recipient_] = installment_;

            initializedVestor[recipient_] = true;

            totalAmount += vestingAmount_;
        }

        INft(nftToken).transferFrom(multiSig, address(this), totalAmount);
    }

<<<<<<< HEAD
    function changeMultiSig(address multiSig_) external onlyMultiSig {
        multiSig = multiSig_;
        emit NewMultiSig(msg.sender, multiSig);
    }

=======
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    function revokeVesting(address recipient) external onlyMultiSig {
        require(initializedVestor[recipient], "Vesting::revokeVesting: recipient not initialized");
        require(!revokedVestor[recipient], "Vesting::revokeVesting: recipient already revoked");

        uint256 remaining = claim(recipient);
<<<<<<< HEAD
        revokedVestor[recipient] = true;
        require(
            INft(nftToken).transfer(multiSig, remaining),
            "Vesting::revokeVesting: failed to transfer remaining tokens"
        );
    }

    function claim(address recipient) public returns (uint256 remaining) {
        require((msg.sender == recipient) || (msg.sender == multiSig), "Vesting::claim: sender must be allowed");
        require(initializedVestor[recipient], "Vesting::claim: recipient not initialized");
        require(!revokedVestor[recipient], "Vesting::claim: recipient already revoked");

        if (block.timestamp < vestingCliff[recipient]) {
            remaining = 0;
        } else {
            uint256 amount;
            if (block.timestamp >= vestingEnd[recipient]) {
                amount = vestingAmount[recipient].sub(claimedAmount[recipient]);
            } else {
                VestingInstallments vInstallment = installment[recipient];

                if (vInstallment == VestingInstallments.MONTHLY) {
                    uint256 elapsedMonths = (block.timestamp - lastUpdate[recipient]).div(MONTH_SECONDS);
                    uint256 totalMonths = (vestingEnd[recipient] - vestingBegin[recipient]).div(MONTH_SECONDS);

                    uint256 tokensPerMonth = vestingAmount[recipient].div(totalMonths);
                    amount = tokensPerMonth.mul(elapsedMonths);
                    lastUpdate[recipient] += (elapsedMonths * MONTH_SECONDS);
                } else if (vInstallment == VestingInstallments.QUARTERLY) {
                    uint256 elapsedQuarters = (block.timestamp - lastUpdate[recipient]).div(QUARTER_SECONDS);
                    uint256 totalQuarters = (vestingEnd[recipient] - vestingBegin[recipient]).div(QUARTER_SECONDS);

                    uint256 tokensPerQuarter = vestingAmount[recipient].div(totalQuarters);
                    amount = tokensPerQuarter.mul(elapsedQuarters);
                    lastUpdate[recipient] += (elapsedQuarters * QUARTER_SECONDS);
                } else {
                    require(false, "Vesting::claim: invalid installment");
                }
            }
            claimedAmount[recipient] += amount;
            require(INft(nftToken).transfer(recipient, amount), "Vesting::claim: failed to transfer remaining tokens");

            remaining = vestingAmount[recipient].sub(claimedAmount[recipient]);
        }
    }

    function currentClaim(address user) external view returns (uint256) {
        require(initializedVestor[user], "Vesting::currentClaim: user not initialized");
        require(!revokedVestor[user], "Vesting::currentClaim: user already revoked");

        if (block.timestamp >= vestingCliff[user]) {
            if (block.timestamp >= vestingEnd[user]) {
                return vestingAmount[user].sub(claimedAmount[user]);
            } else {
                VestingInstallments vInstallment = installment[user];

                if (vInstallment == VestingInstallments.MONTHLY) {
                    uint256 totalMonths = (vestingEnd[user] - vestingBegin[user]).div(MONTH_SECONDS);
                    uint256 tokensPerMonth = vestingAmount[user].div(totalMonths);
                    uint256 elapsedMonths = (block.timestamp - lastUpdate[user]).div(MONTH_SECONDS);
                    return tokensPerMonth.mul(elapsedMonths);
                } else if (vInstallment == VestingInstallments.QUARTERLY) {
                    uint256 totalQuarters = (vestingEnd[user] - vestingBegin[user]).div(QUARTER_SECONDS);
                    uint256 tokensPerQuarter = vestingAmount[user].div(totalQuarters);

                    uint256 elapsedQuarters = (block.timestamp - lastUpdate[user]).div(QUARTER_SECONDS);
                    return tokensPerQuarter.mul(elapsedQuarters);
                } else {
                    return 0;
                }
            }
        } else {
            return 0;
        }
    }

    function toBeVested(address user) external view returns (uint256) {
        require(initializedVestor[user], "Vesting::toBeVested: user not initialized");
        require(!revokedVestor[user], "Vesting::toBeVested: user already revoked");
        return vestingAmount[user].sub(claimedAmount[user]);
    }

    function getVestingInfo(address user) external view returns (VestingInfo memory) {
        return
            VestingInfo(
                claimedAmount[user],
                vestingAmount[user],
                vestingBegin[user],
                vestingCliff[user],
                vestingEnd[user],
                lastUpdate[user],
                installment[user],
                revokedVestor[user]
            );
    }

    function multiClaim(address[] calldata recipients) public {
        require(msg.sender == multiSig);
        for (uint256 i = 0; i < recipients.length; i++) {
            claim(recipients[i]);
        }
=======

        revokedVestor[recipient] = true;
        INft(nftToken).transfer(multiSig, remaining);
    }

    function claim(address recipient) public returns (uint256 remaining) {
        require(initializedVestor[recipient], "Vesting::claim: recipient not initialized");
        require(!revokedVestor[recipient], "Vesting::claim: recipient already revoked");

        require(block.timestamp >= vestingCliff[recipient], "Vesting::claim: cliff not met");
        uint256 amount;
        if (block.timestamp >= vestingEnd[recipient]) {
            amount = vestingAmount[recipient].sub(claimedAmount[recipient]);
        } else {
            VestingInstallments vInstallment = installment[recipient];

            // ADVISOR
            if (vInstallment == VestingInstallments.MONTHLY) {
                uint256 elapsedMonths = (block.timestamp - lastUpdate[recipient]).div(MONTH_SECONDS);
                uint256 totalMonths = (vestingEnd[recipient] - vestingBegin[recipient]).div(MONTH_SECONDS);

                uint256 tokensPerMonth = vestingAmount[recipient].div(totalMonths);

                amount = tokensPerMonth.mul(elapsedMonths);
                lastUpdate[recipient] += elapsedMonths * MONTH_SECONDS;
            } else {
                // QUARTERLY
                uint256 elapsedQuarters = (block.timestamp - vestingBegin[recipient]).div(QUARTER_SECONDS);
                uint256 totalQuarters = (vestingEnd[recipient] - vestingBegin[recipient]).div(QUARTER_SECONDS);

                uint256 tokensPerQuarter = vestingAmount[recipient].div(totalQuarters);

                amount = tokensPerQuarter.mul(elapsedQuarters);
                lastUpdate[recipient] += elapsedQuarters * MONTH_SECONDS;
            }
        }
        claimedAmount[recipient] += amount;
        INft(nftToken).transfer(recipient, amount);

        remaining = vestingAmount[recipient].sub(claimedAmount[recipient]);
>>>>>>> 3bfee0511d5793cfe0ac5063583238539ef34398
    }
}
