/* eslint-disable prefer-const */
import { BigNumber, constants, Contract, utils } from "ethers";
import { ethers } from "hardhat";
import { setup } from "./utils/setup";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const FEE_RECIPIENT = "";
const ROYALTY_COLLECTOR = "";
const STANDARD_PROTOCOL_FEE = BigNumber.from("200");
const ROYALTY_FEE_LIMIT = BigNumber.from("8500"); // 85%
const DEPLOY_MOCK = true;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Exchange contracts
  let transferSelectorNFT: Contract;
  let transferManagerERC721: Contract;
  let transferManagerERC1155: Contract;
  let transferManagerNonCompliantERC721: Contract;
  let currencyManager: Contract;
  let executionManager: Contract;
  let royaltyFeeManager: Contract;
  let royaltyFeeRegistry: Contract;
  let royaltyFeeSetter: Contract;
  let looksRareExchange: Contract;
  let orderValidatorV1: Contract;

  // Strategy contracts (used for this test file)
  let strategyPrivateSale: Contract;
  let strategyStandardSaleForFixedPrice: Contract;

  // Other global variables
  let standardProtocolFee: BigNumber;
  let royaltyFeeLimit: BigNumber;
  // let accounts: SignerWithAddress[];
  let admin: string;
  let feeRecipient: string;
  let royaltyCollector: string;
  let startTimeOrder: BigNumber;
  let endTimeOrder: BigNumber;

  admin = deployer.address;
  feeRecipient = FEE_RECIPIENT;
  royaltyCollector = ROYALTY_COLLECTOR;
  standardProtocolFee = STANDARD_PROTOCOL_FEE;
  royaltyFeeLimit = ROYALTY_FEE_LIMIT; // 95%

  await setup(admin, feeRecipient, royaltyCollector, standardProtocolFee, royaltyFeeLimit, DEPLOY_MOCK);
}

main()
  // eslint-disable-next-line no-process-exit
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
