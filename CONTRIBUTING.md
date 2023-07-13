# Contribution Guidelines

Thanks for your interest in contributing to NFT.com's smart contracts. The contracts in this repo are now open-sourced.

The goal is to encourage community participation and steering in this new phase of DAO-led development.

Unfortunately, there are no active repository maintainers at the moment so if any questions arise, please consider reaching out in our [Discord](https://nft.com/discord) or creating an issue in this repository.

## Types of Contributions
1. **Opening an issue.** Before opening an issue, please check that there is not an issue already open. If there is, feel free to comment more details, explanations, or examples within the open issue rather than duplicating it. Suggesting changes to the open development process are within the bounds of opening issues. We are always open to feedback and receptive to suggestions!
2. **Resolving an issue.** You can resolve an issue either by showing that it is not an issue or by fixing the issue with code changes, additional tests, etc. Any pull request fixing an issue should reference that issue.
3. **Reviewing open PRs.** You can provide comments, standards guidance, naming suggestions, gas optimizations, or ideas for alternative designs on any open pull request.

## Opening an Issue
When opening an issue, choose a template to start from: Bug Report or Feature Improvement. For bug reports, you should be able to reproduce the bug through tests or proof of concept implementations. For feature improvements, please title it with a concise problem statement and check that a similar request is not already open or already in progress. Not all issues may be deemed worth resolving, so please follow through with responding to any questions or comments that others may have regarding the issue.

Feel free to tag the issue as a “good first issue” for any clean-up related issues, or small scoped changes to help encourage pull requests from first time contributors!

## Opening a Pull Request

All pull requests should be opened against the `main` branch.  In the pull request, please reference the issue you are fixing.

Pull requests can be reviewed by community members, but to be merged they will need approval from community elected maintainer(s).

Finally, before opening a pull request please do the following:

- Write specific tests that address the new feature set.
- Document any new functions, structs, or interfaces following the natspec standard.
- Make sure all commits are [signed](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) 

## Standards

All contributions must follow the below standards.

1. These contracts follow the [solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html) with one minor exception of using the _prependUnderscore style naming for internal contract functions, internal top-level parameters, and function parameters with naming collisions.
2. All external facing contracts should inherit from interfaces, which specify and document its functions with natspec.
3. Picking up stale issues by other authors is fine! Please just communicate with them ahead of time and it is best practice to include co-authors in any commits.
4. Squash commits where possible to make reviews clean and efficient. PRs that are merged to main will be squashed into 1 commit.

## Setup

`yarn install` to install dependencies for hardhat

`yarn compile` to compile contracts for hardhat

## Tests

This repo currently uses hardhat and forge tests. Please run both test suites before opening a PR.

`yarn test` to run hardhat tests

`yarn prettier` to run the formatter (runs both typescript and solidity formatting)

## Code of Conduct

Above all else, please be respectful of the people behind the code. Any kind of aggressive or disrespectful comments, issues, and language will be removed.

Issues and PRs that are obviously spam and unhelpful to the development process or unrelated to the core code will also be closed.
