import { BigNumber, constants, Contract, utils } from "ethers";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
const basePath = process.cwd();
const dataPath = path.join(basePath, "scripts/data");
const dataFilePath = path.join(dataPath, "deployed.json");
const tempFilePath = path.join(dataPath, "tempdata.json");

const FEE_RECIPIENT = "0xdcA03d57e5eC959FC6E2BcB41819778149BfC13b";
const ROYALTY_COLLECTOR = "0xdcA03d57e5eC959FC6E2BcB41819778149BfC13b";
const STANDARD_PROTOCOL_FEE = BigNumber.from("200");
const ROYALTY_FEE_LIMIT = BigNumber.from("8500"); // 85%
const DEPLOY_MOCK = true;
// goerli
const WETH_ADDRESS = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

// async function main() {
//   const storedData = fs.readFileSync(dataFilePath, "utf8");
//   console.log(process.cwd());
//   console.log(__dirname);
//   console.log("storedData", JSON.parse(storedData));
// }

function saveState(state: any) {
  fs.writeFileSync(tempFilePath, JSON.stringify(state, null, 2));
}

async function main() {
  let storedData;
  try {
    storedData = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
  } catch (e) {
    storedData = {};
  }

  if (storedData?.complete) {
    console.log("Deployment already complete");
    console.log("delete data/deployed.json to redeploy");
    return;
  }

  let tempData;
  try {
    tempData = JSON.parse(fs.readFileSync(tempFilePath, "utf8"));
  } catch (e) {
    tempData = {};
  }
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  tempData = { ...tempData, deployer: deployer.address };
  const admin = deployer.address;
  const feeRecipient = FEE_RECIPIENT;
  const royaltyCollector = ROYALTY_COLLECTOR;
  const standardProtocolFee = STANDARD_PROTOCOL_FEE;
  const royaltyFeeLimit = ROYALTY_FEE_LIMIT; // 95%

  const weth = await ethers.getContractAt("WETH", WETH_ADDRESS);
  console.log("WETH address:", weth.address);
  tempData = { ...tempData, weth: weth.address };

  /** 2. Deploy ExecutionManager contract and add WETH to whitelisted currencies
   */
  let currencyManager;
  if (tempData.currencyManager) {
    currencyManager = await ethers.getContractAt("CurrencyManager", tempData.currencyManager);
    const wethAdded = await currencyManager.isCurrencyWhitelisted(weth.address);
    if (!wethAdded) {
      await currencyManager.addCurrency(WETH_ADDRESS);
    }
  } else {
    const CurrencyManager = await ethers.getContractFactory("CurrencyManager");
    currencyManager = await CurrencyManager.deploy();
    await currencyManager.deployed();
    await currencyManager.addCurrency(WETH_ADDRESS);
  }
  console.log("CurrencyManager address:", currencyManager.address);
  tempData = { ...tempData, currencyManager: currencyManager.address };
  saveState(tempData);

  /** 3. Deploy ExecutionManager contract
   */
  let executionManager;
  if (tempData.executionManager) {
    executionManager = await ethers.getContractAt("ExecutionManager", tempData.executionManager);
  } else {
    const ExecutionManager = await ethers.getContractFactory("ExecutionManager");
    executionManager = await ExecutionManager.deploy();
    await executionManager.deployed();
  }
  console.log("ExecutionManager address:", executionManager.address);
  tempData = { ...tempData, executionManager: executionManager.address };
  saveState(tempData);

  /** 4. Deploy execution strategy contracts for trade execution
   */
  let strategyAnyItemFromCollectionForFixedPrice;
  if (tempData.strategyAnyItemFromCollectionForFixedPrice) {
    strategyAnyItemFromCollectionForFixedPrice = await ethers.getContractAt(
      "StrategyAnyItemFromCollectionForFixedPrice",
      tempData.strategyAnyItemFromCollectionForFixedPrice
    );
  } else {
    const StrategyAnyItemFromCollectionForFixedPrice = await ethers.getContractFactory(
      "StrategyAnyItemFromCollectionForFixedPrice"
    );
    strategyAnyItemFromCollectionForFixedPrice = await StrategyAnyItemFromCollectionForFixedPrice.deploy(200);
    await strategyAnyItemFromCollectionForFixedPrice.deployed();
  }
  console.log(
    "StrategyAnyItemFromCollectionForFixedPrice address:",
    strategyAnyItemFromCollectionForFixedPrice.address
  );
  tempData = {
    ...tempData,
    strategyAnyItemFromCollectionForFixedPrice: strategyAnyItemFromCollectionForFixedPrice.address,
  };
  saveState(tempData);

  let strategyAnyItemInASetForFixedPrice;
  if (tempData.strategyAnyItemInASetForFixedPrice) {
    strategyAnyItemInASetForFixedPrice = await ethers.getContractAt(
      "StrategyAnyItemInASetForFixedPrice",
      tempData.strategyAnyItemInASetForFixedPrice
    );
  } else {
    const StrategyAnyItemInASetForFixedPrice = await ethers.getContractFactory("StrategyAnyItemInASetForFixedPrice");
    strategyAnyItemInASetForFixedPrice = await StrategyAnyItemInASetForFixedPrice.deploy(standardProtocolFee);
    await strategyAnyItemInASetForFixedPrice.deployed();
  }
  console.log("StrategyAnyItemInASetForFixedPrice address:", strategyAnyItemInASetForFixedPrice.address);
  tempData = { ...tempData, strategyAnyItemInASetForFixedPrice: strategyAnyItemInASetForFixedPrice.address };
  saveState(tempData);

  let strategyDutchAuction;
  if (tempData.strategyDutchAuction) {
    strategyDutchAuction = await ethers.getContractAt("StrategyDutchAuction", tempData.strategyDutchAuction);
  } else {
    const StrategyDutchAuction = await ethers.getContractFactory("StrategyDutchAuction");
    strategyDutchAuction = await StrategyDutchAuction.deploy(
      standardProtocolFee,
      BigNumber.from("900") // 15 minutes
    );
    await strategyDutchAuction.deployed();
  }
  console.log("StrategyDutchAuction address:", strategyDutchAuction.address);
  tempData = { ...tempData, strategyDutchAuction: strategyDutchAuction.address };
  saveState(tempData);

  let strategyPrivateSale;
  if (tempData.strategyPrivateSale) {
    strategyPrivateSale = await ethers.getContractAt("StrategyPrivateSale", tempData.strategyPrivateSale);
  } else {
    const StrategyPrivateSale = await ethers.getContractFactory("StrategyPrivateSale");
    strategyPrivateSale = await StrategyPrivateSale.deploy(constants.Zero);
    await strategyPrivateSale.deployed();
  }
  console.log("StrategyPrivateSale address:", strategyPrivateSale.address);
  tempData = { ...tempData, strategyPrivateSale: strategyPrivateSale.address };
  saveState(tempData);

  let strategyStandardSaleForFixedPrice;
  if (tempData.strategyStandardSaleForFixedPrice) {
    strategyStandardSaleForFixedPrice = await ethers.getContractAt(
      "StrategyStandardSaleForFixedPrice",
      tempData.strategyStandardSaleForFixedPrice
    );
  } else {
    const StrategyStandardSaleForFixedPrice = await ethers.getContractFactory("StrategyStandardSaleForFixedPrice");
    strategyStandardSaleForFixedPrice = await StrategyStandardSaleForFixedPrice.deploy(standardProtocolFee);
    await strategyStandardSaleForFixedPrice.deployed();
  }
  console.log("StrategyStandardSaleForFixedPrice address:", strategyStandardSaleForFixedPrice.address);
  tempData = { ...tempData, strategyStandardSaleForFixedPrice: strategyStandardSaleForFixedPrice.address };
  saveState(tempData);

  // Whitelist these five strategies
  if (!(await executionManager.isStrategyWhitelisted(strategyStandardSaleForFixedPrice.address))) {
    await executionManager.addStrategy(strategyStandardSaleForFixedPrice.address);
  }
  if (!(await executionManager.isStrategyWhitelisted(strategyAnyItemFromCollectionForFixedPrice.address))) {
    await executionManager.addStrategy(strategyAnyItemFromCollectionForFixedPrice.address);
  }
  if (!(await executionManager.isStrategyWhitelisted(strategyAnyItemInASetForFixedPrice.address))) {
    await executionManager.addStrategy(strategyAnyItemInASetForFixedPrice.address);
  }
  if (!(await executionManager.isStrategyWhitelisted(strategyDutchAuction.address))) {
    await executionManager.addStrategy(strategyDutchAuction.address);
  }
  if (!(await executionManager.isStrategyWhitelisted(strategyPrivateSale.address))) {
    await executionManager.addStrategy(strategyPrivateSale.address);
  }
  console.log("Execution strategies deployed and whitelisted");

  /** 5. Deploy RoyaltyFee Registry/Setter/Manager
   */
  let royaltyFeeRegistry;
  if (tempData.royaltyFeeRegistry) {
    royaltyFeeRegistry = await ethers.getContractAt("RoyaltyFeeRegistry", tempData.royaltyFeeRegistry);
  } else {
    const RoyaltyFeeRegistry = await ethers.getContractFactory("RoyaltyFeeRegistry");
    royaltyFeeRegistry = await RoyaltyFeeRegistry.deploy(royaltyFeeLimit);
    await royaltyFeeRegistry.deployed();
  }
  console.log("RoyaltyFeeRegistry address:", royaltyFeeRegistry.address);
  tempData = { ...tempData, royaltyFeeRegistry: royaltyFeeRegistry.address };
  saveState(tempData);

  let royaltyFeeSetter;
  if (tempData.royaltyFeeSetter) {
    royaltyFeeSetter = await ethers.getContractAt("RoyaltyFeeSetter", tempData.royaltyFeeSetter);
  } else {
    const RoyaltyFeeSetter = await ethers.getContractFactory("RoyaltyFeeSetter");
    royaltyFeeSetter = await RoyaltyFeeSetter.deploy(royaltyFeeRegistry.address);
    await royaltyFeeSetter.deployed();
  }
  console.log("RoyaltyFeeSetter address:", royaltyFeeSetter.address);
  tempData = { ...tempData, royaltyFeeSetter: royaltyFeeSetter.address };
  saveState(tempData);

  let royaltyFeeManager;
  if (tempData.royaltyFeeManager) {
    royaltyFeeManager = await ethers.getContractAt("RoyaltyFeeManager", tempData.royaltyFeeManager);
  } else {
    const RoyaltyFeeManager = await ethers.getContractFactory("RoyaltyFeeManager");
    royaltyFeeManager = await RoyaltyFeeManager.deploy(royaltyFeeRegistry.address);
    await royaltyFeeSetter.deployed();
  }
  console.log("RoyaltyFeeManager address:", royaltyFeeManager.address);
  tempData = { ...tempData, royaltyFeeManager: royaltyFeeManager.address };
  saveState(tempData);
  // Transfer ownership of RoyaltyFeeRegistry to RoyaltyFeeSetter
  if ((await royaltyFeeRegistry.owner()) !== royaltyFeeSetter.address) {
    await royaltyFeeRegistry.transferOwnership(royaltyFeeSetter.address);
  }
  console.log("RoyaltyFeeRegistry ownership transferred to RoyaltyFeeSetter");

  /** 6. Deploy LooksRareExchange contract
   */
  let looksRareExchange;
  if (tempData.looksRareExchange) {
    looksRareExchange = await ethers.getContractAt("LooksRareExchange", tempData.looksRareExchange);
  } else {
    const LooksRareExchange = await ethers.getContractFactory("LooksRareExchange");
    looksRareExchange = await LooksRareExchange.deploy(
      currencyManager.address,
      executionManager.address,
      royaltyFeeManager.address,
      weth.address,
      feeRecipient
    );
    await looksRareExchange.deployed();
  }
  console.log("LooksRareExchange address:", looksRareExchange.address);
  tempData = { ...tempData, looksRareExchange: looksRareExchange.address };
  saveState(tempData);

  /** 7. Deploy TransferManager contracts and TransferSelector
   */
  let transferManagerERC721;
  if (tempData.transferManagerERC721) {
    transferManagerERC721 = await ethers.getContractAt("TransferManagerERC721", tempData.transferManager);
  } else {
    const TransferManagerERC721 = await ethers.getContractFactory("TransferManagerERC721");
    transferManagerERC721 = await TransferManagerERC721.deploy(looksRareExchange.address);
    await transferManagerERC721.deployed();
  }
  console.log("TransferManagerERC721 address:", transferManagerERC721.address);
  tempData = { ...tempData, transferManagerERC721: transferManagerERC721.address };
  saveState(tempData);

  let transferManagerERC1155;
  if (tempData.transferManagerERC1155) {
    transferManagerERC1155 = await ethers.getContractAt("TransferManagerERC1155", tempData.transferManager);
  } else {
    const TransferManagerERC1155 = await ethers.getContractFactory("TransferManagerERC1155");
    transferManagerERC1155 = await TransferManagerERC1155.deploy(looksRareExchange.address);
    await transferManagerERC1155.deployed();
  }
  console.log("TransferManagerERC1155 address:", transferManagerERC1155.address);
  tempData = { ...tempData, transferManagerERC1155: transferManagerERC1155.address };
  saveState(tempData);

  let transferManagerNonCompliantERC721;
  if (tempData.transferManagerNonCompliantERC721) {
    transferManagerNonCompliantERC721 = await ethers.getContractAt(
      "TransferManagerNonCompliantERC721",
      tempData.transferManager
    );
  } else {
    const TransferManagerNonCompliantERC721 = await ethers.getContractFactory("TransferManagerNonCompliantERC721");
    transferManagerNonCompliantERC721 = await TransferManagerNonCompliantERC721.deploy(looksRareExchange.address);
    await transferManagerNonCompliantERC721.deployed();
  }
  console.log("TransferManagerNonCompliantERC721 address:", transferManagerNonCompliantERC721.address);
  tempData = { ...tempData, transferManagerNonCompliantERC721: transferManagerNonCompliantERC721.address };
  saveState(tempData);

  let transferSelectorNFT;
  if (tempData.transferSelectorNFT) {
    transferSelectorNFT = await ethers.getContractAt("TransferSelectorNFT", tempData.transferSelectorNFT);
  } else {
    const TransferSelectorNFT = await ethers.getContractFactory("TransferSelectorNFT");
    transferSelectorNFT = await TransferSelectorNFT.deploy(
      transferManagerERC721.address,
      transferManagerERC1155.address
    );
    await transferSelectorNFT.deployed();
  }
  console.log("TransferSelectorNFT address:", transferSelectorNFT.address);
  tempData = { ...tempData, transferSelectorNFT: transferSelectorNFT.address };
  saveState(tempData);

  // Set TransferSelectorNFT in LooksRare exchange
  await looksRareExchange.updateTransferSelectorNFT(transferSelectorNFT.address);
  console.log("TransferSelectorNFT set in LooksRareExchange");

  tempData = { ...tempData, timestamp: Date.now(), complete: true };

  /** 8. Save tempdata to file  */
  fs.writeFileSync(dataFilePath, JSON.stringify(tempData, null, 2));

  // clear tempData
  saveState({});

  console.log("All contracts deployed and configured");
}

main()
  // eslint-disable-next-line no-process-exit
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  });
