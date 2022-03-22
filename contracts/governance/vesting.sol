// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

interface INft {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address dst, uint256 rawAmount) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 rawAmount
    ) external returns (bool);
}

contract Vesting {
    using SafeMath for uint256;

    // post 1 year cliff
    enum VestingInstallments {
        MONTHLY,
        QUARTERLY
    }

    uint256 public constant MONTH_SECONDS = 30 days;
    uint256 public constant QUARTER_SECONDS = 91 days;

    address public nftToken;
    address public multiSig;

    mapping(address => uint256) public claimedAmount;
    mapping(address => uint256) public vestingAmount;
    mapping(address => uint256) public vestingBegin;
    mapping(address => uint256) public vestingCliff;
    mapping(address => uint256) public vestingEnd;
    mapping(address => uint256) public lastUpdate;
    mapping(address => VestingInstallments) public installment;

    mapping(address => bool) public initializedVestor;
    mapping(address => bool) public revokedVestor;

    modifier onlyMultiSig() {
        require(msg.sender == multiSig, "Vesting::onlyMultiSig: Only multisig can call this function");
        _;
    }

    constructor(address nftToken_, address multiSig_) {
        nftToken = nftToken_;
        multiSig = multiSig_;
    }

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

        console.log("MONTH_SECONDS: ", MONTH_SECONDS);
        console.log("QUARTER_SECONDS: ", QUARTER_SECONDS);

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

    function revokeVesting(address recipient) external onlyMultiSig {
        require(initializedVestor[recipient], "Vesting::revokeVesting: recipient not initialized");
        require(!revokedVestor[recipient], "Vesting::revokeVesting: recipient already revoked");

        uint256 remaining = claim(recipient);

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
    }
}
