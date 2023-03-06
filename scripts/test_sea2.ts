import { ethers } from "hardhat";

import { SeaportCustom } from "@mirrorworld/seaport-js";
import {
  ApprovalActionCustom,
  CreateOrderAction,
  ExchangeActionCustom,
  OrderComponents,
  OrderWithCounter
} from "@mirrorworld/seaport-js/lib/types";

import { readFileSync } from "fs";

import { ConduitController__factory } from "../typechain/factories/ConduitController__factory";
import { ConduitController } from "../typechain/ConduitController";

import { Seaport__factory } from "../typechain/factories/Seaport__factory";
import { Seaport } from "../typechain/Seaport";

import { TestERC20__factory } from "../typechain/factories/TestERC20__factory";
import { TestERC20 } from "../typechain/TestERC20";

import { TestERC721__factory } from "../typechain/factories/TestERC721__factory";
import { TestERC721 } from "../typechain/TestERC721";

import { TestERC1155__factory } from "../typechain/factories/TestERC1155__factory";
import { TestERC1155 } from "../typechain/TestERC1155";
import { ItemType } from "@opensea/seaport-js/lib/constants";
import * as path from "path";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Wallet } from "ethers";
import { TransactionRequest } from "@ethersproject/providers";
import assert from "assert";

let conduitController: ConduitController;
let seaport: Seaport;

let sellingERC20: TestERC20;
let sellingERC721: TestERC721;
let sellingERC1155: TestERC1155;

let buyingERC20: TestERC20;
let buyingERC721: TestERC721;
let buyingERC1155: TestERC1155;

let addressOneSeaClient: SeaportCustom;
let addressTwoSeaClient: SeaportCustom;
let addressThreeSeaClient: SeaportCustom;

let signerOne: SignerWithAddress;
let signerTwo: SignerWithAddress;
let signerThree: SignerWithAddress;

let signerOneWallet: Wallet;
let signerTwoWallet: Wallet;
let signerThreeWallet: Wallet;

let provider = ethers.provider;

async function main() {
  // await deployContractFromFile();
  await deployConduitController();
  await deploySeaport();
  await deployTestERC();
  await createClients();
  await mintTokens();

  await createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithEth();
  await createERC721OrderForSignerOneAndCancelOrder();
  await createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithERC20();
  await createERC721OrderForTwoTokensForSignerOneAndFillTheOrderForSignerTwoWithEth();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function deployContractFromFile() {

  const uriSeaport = path.join(__dirname, "../contract_deploy_data/Seaport.json");
  const uriConduitController = path.join(__dirname, "../contract_deploy_data/ConduitController.json");
  let dataSeaport = readFileSync(uriSeaport, "utf8");
  let dataConduitController = readFileSync(uriConduitController, "utf8");

  let abiSeaport = JSON.parse(dataSeaport);
  let abiConduitController = JSON.parse(dataConduitController);

  let conduitControllerContract = new ethers.ContractFactory(new ethers.utils.Interface(abiConduitController["abi"]), abiConduitController["bytecode"], (await ethers.getSigner((await ethers.getSigners())[1].address)));
  const conduitControllerContractDeploy = await conduitControllerContract.deploy();
  await conduitControllerContractDeploy.deployed();


  let seaportContract = new ethers.ContractFactory(new ethers.utils.Interface(abiSeaport["abi"]), abiSeaport["bytecode"], (await ethers.getSigner((await ethers.getSigners())[1].address)));
  const seaportContractDeploy = await seaportContract.deploy(conduitControllerContractDeploy.address);
  await seaportContractDeploy.deployed();
}

async function deployConduitController() {
  const conduitControllerFactory: ConduitController__factory = await ethers.getContractFactory("ConduitController");
  conduitController = await conduitControllerFactory.deploy({});
  await conduitController.deployed();

  console.log("conduitController: ", conduitController.address);
}

async function deploySeaport() {
  const seaportFactory: Seaport__factory = await ethers.getContractFactory("Seaport");
  seaport = await seaportFactory.deploy(conduitController.address);
  await seaport.deployed();

  console.log("Seaport: ", seaport.address);

}

async function deployTestERC() {

  const testERC20Factory: TestERC20__factory = await ethers.getContractFactory("TestERC20");

  sellingERC20 = await testERC20Factory.deploy();
  await sellingERC20.deployed();
  console.log("Seller ERC20: ", sellingERC20.address);

  buyingERC20 = await testERC20Factory.deploy();
  await buyingERC20.deployed();
  console.log("Buying ERC20: ", buyingERC20.address);

  const testERC721Factory: TestERC721__factory = await ethers.getContractFactory("TestERC721");

  sellingERC721 = await testERC721Factory.deploy();
  await sellingERC721.deployed();
  console.log("Selling ERC721: ", sellingERC721.address);

  buyingERC721 = await testERC721Factory.deploy();
  await buyingERC721.deployed();
  console.log("Buying ERC721: ", buyingERC721.address);

  const testERC1155Factory: TestERC1155__factory = await ethers.getContractFactory("TestERC1155");

  sellingERC1155 = await testERC1155Factory.deploy();
  await sellingERC1155.deployed();
  console.log("Selling ERC1155: ", sellingERC1155.address);

  buyingERC1155 = await testERC1155Factory.deploy();
  await buyingERC1155.deployed();
  console.log("Buying ERC1155: ", buyingERC1155.address);
}

async function createClients() {

  signerOne = await ethers.getSigner((await ethers.getSigners())[1].address);
  signerTwo = await ethers.getSigner((await ethers.getSigners())[2].address);
  signerThree = await ethers.getSigner((await ethers.getSigners())[3].address);

  signerOneWallet = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  signerTwoWallet = new Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  signerThreeWallet = new Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");

  addressOneSeaClient = new SeaportCustom(provider, signerOneWallet.address, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  addressTwoSeaClient = new SeaportCustom(provider, signerTwoWallet.address, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  addressThreeSeaClient = new SeaportCustom(provider, signerThreeWallet.address, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  assert(signerOne.address == signerOneWallet.address, "Invalid Address");
}

async function mintTokens() {
  (await (await sellingERC721.mint(signerOne.address, 1)).wait());
  (await (await sellingERC721.mint(signerOne.address, 2)).wait());
  (await (await sellingERC721.mint(signerOne.address, 3)).wait());
  (await (await sellingERC721.mint(signerOne.address, 4)).wait());
  (await (await sellingERC721.mint(signerOne.address, 5)).wait());
  (await (await sellingERC721.mint(signerOne.address, 6)).wait());
  (await (await sellingERC721.mint(signerOne.address, 7)).wait());
  (await (await sellingERC721.mint(signerOne.address, 8)).wait());
  (await (await sellingERC721.mint(signerOne.address, 9)).wait());
  (await (await sellingERC721.mint(signerOne.address, 10)).wait());

  (await (await buyingERC721.mint(signerTwo.address, 1)).wait());
  (await (await buyingERC721.mint(signerTwo.address, 2)).wait());
  (await (await buyingERC721.mint(signerTwo.address, 3)).wait());
  (await (await buyingERC721.mint(signerTwo.address, 4)).wait());
  (await (await buyingERC721.mint(signerTwo.address, 5)).wait());

  (await (await sellingERC1155.mint(signerOne.address, 1, 50)).wait());
  (await (await sellingERC1155.mint(signerOne.address, 2, 50)).wait());

  (await (await buyingERC1155.mint(signerTwo.address, 1, 50)).wait());
  (await (await buyingERC1155.mint(signerTwo.address, 2, 50)).wait());


  (await (await sellingERC20.mint(signerOne.address, ethers.utils.parseEther("100"))).wait());

  (await (await buyingERC20.mint(signerTwo.address, ethers.utils.parseEther("100"))).wait());
}

async function createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithEth() {
  console.log("createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithEth");
  // Create Order
  const {
    executeAllActions: signerOneOrderExecuteAllActions,
    actions: signerOneOrderActions
  } = await addressOneSeaClient.createOrder(
    {
      offer: [
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "1"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: signerOneWallet.address
        }
      ]
    },
    signerOneWallet.address
  );

  let orderWithCounter: OrderWithCounter | undefined = undefined;

  for (const createOrderAction of signerOneOrderActions) {
    if (createOrderAction.type == "approval") {
      await handleApprovalAction(createOrderAction, signerOneWallet);
    } else if (createOrderAction.type == "create") {
      orderWithCounter = await handleCreateOrderAction(createOrderAction, signerOneWallet, addressOneSeaClient);
    }
  }

  // Fill the Order

  const { executeAllActions: signerTwoOrderExecuteAllActions, actions: signerTwoOrderActions } =
    await addressTwoSeaClient.fulfillOrder({
      order: orderWithCounter as OrderWithCounter,
      accountAddress: signerTwoWallet.address
    });

  for (const fillOrderAction of signerTwoOrderActions) {
    if (fillOrderAction.type == "approval") {
      await handleApprovalAction(fillOrderAction, signerTwoWallet);
    } else if (fillOrderAction.type == "exchange") {
      await handleExchangeAction(fillOrderAction, signerTwoWallet);
    }
  }

  // Check
  assert(signerTwoWallet.address == (await sellingERC721.ownerOf(1)), "Invalid Token Owner");

}

async function createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithEthWithFee() {
  console.log("createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithEth");
  // Create Order
  const {
    executeAllActions: signerOneOrderExecuteAllActions,
    actions: signerOneOrderActions
  } = await addressOneSeaClient.createOrder(
    {
      offer: [
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "1"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: signerOneWallet.address
        }
      ]
    },
    signerOneWallet.address
  );

  let orderWithCounter: OrderWithCounter | undefined = undefined;

  for (const createOrderAction of signerOneOrderActions) {
    if (createOrderAction.type == "approval") {
      await handleApprovalAction(createOrderAction, signerOneWallet);
    } else if (createOrderAction.type == "create") {
      orderWithCounter = await handleCreateOrderAction(createOrderAction, signerOneWallet, addressOneSeaClient);
    }
  }

  // Fill the Order

  const { executeAllActions: signerTwoOrderExecuteAllActions, actions: signerTwoOrderActions } =
    await addressTwoSeaClient.fulfillOrder({
      order: orderWithCounter as OrderWithCounter,
      accountAddress: signerTwoWallet.address
    });

  for (const fillOrderAction of signerTwoOrderActions) {
    if (fillOrderAction.type == "approval") {
      await handleApprovalAction(fillOrderAction, signerTwoWallet);
    } else if (fillOrderAction.type == "exchange") {
      await handleExchangeAction(fillOrderAction, signerTwoWallet);
    }
  }

  // Check
  assert(signerTwoWallet.address == (await sellingERC721.ownerOf(1)), "Invalid Token Owner");

}

async function createERC721OrderForTwoTokensForSignerOneAndFillTheOrderForSignerTwoWithEth() {
  console.log("createERC721OrderForTwoTokensForSignerOneAndFillTheOrderForSignerTwoWithEth");
  // Create Order
  const {
    executeAllActions: signerOneOrderExecuteAllActions,
    actions: signerOneOrderActions
  } = await addressOneSeaClient.createOrder(
    {
      offer: [
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "3"

        },
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "4"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: signerOneWallet.address
        }
      ]
    },
    signerOneWallet.address
  );

  let orderWithCounter: OrderWithCounter | undefined = undefined;

  for (const createOrderAction of signerOneOrderActions) {
    if (createOrderAction.type == "approval") {
      await handleApprovalAction(createOrderAction, signerOneWallet);
    } else if (createOrderAction.type == "create") {
      orderWithCounter = await handleCreateOrderAction(createOrderAction, signerOneWallet, addressOneSeaClient);
    }
  }

  // Fill the Order

  const { executeAllActions: signerTwoOrderExecuteAllActions, actions: signerTwoOrderActions } =
    await addressTwoSeaClient.fulfillOrder({
      order: orderWithCounter as OrderWithCounter,
      accountAddress: signerTwoWallet.address
    });

  for (const fillOrderAction of signerTwoOrderActions) {
    if (fillOrderAction.type == "approval") {
      await handleApprovalAction(fillOrderAction, signerTwoWallet);
    } else if (fillOrderAction.type == "exchange") {
      await handleExchangeAction(fillOrderAction, signerTwoWallet);
    }
  }

  // Check
  assert(signerTwoWallet.address == (await sellingERC721.ownerOf(3)), "Invalid Token Owner");
  assert(signerTwoWallet.address == (await sellingERC721.ownerOf(4)), "Invalid Token Owner");

}

async function createERC721OrderForSignerOneAndCancelOrder() {
  console.log("createERC721OrderForSignerOneAndCancelOrder");
  // Create Order
  const {
    executeAllActions: signerOneOrderExecuteAllActions,
    actions: signerOneOrderActions
  } = await addressOneSeaClient.createOrder(
    {
      offer: [
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "2"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: signerOneWallet.address
        }
      ]
    },
    signerOneWallet.address
  );

  let orderWithCounter : OrderWithCounter | undefined = undefined;

  for (const createOrderAction of signerOneOrderActions) {
    if (createOrderAction.type == "approval") {
      await handleApprovalAction(createOrderAction, signerOneWallet);
    } else if (createOrderAction.type == "create") {
      orderWithCounter = await handleCreateOrderAction(createOrderAction, signerOneWallet, addressOneSeaClient);
    }
  }

  // Cancel Order
  const cancelTx = await addressOneSeaClient.cancelOrdersTransactionRequest(
    [orderWithCounter?.parameters as OrderComponents],
    orderWithCounter?.parameters.offerer
  );

  await handleCancelOrdersTransactionRequest(cancelTx, signerOneWallet);
}

async function createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithERC20() {
  console.log("createERC721OrderForSignerOneAndFillTheOrderForSignerTwoWithERC20");

  assert((await buyingERC20.balanceOf(signerOneWallet.address)).toNumber() == 0, "Invalid Amount");

  // Create Order
  const {
    executeAllActions: signerOneOrderExecuteAllActions,
    actions: signerOneOrderActions
  } = await addressOneSeaClient.createOrder(
    {
      offer: [
        {
          itemType: ItemType.ERC721,
          token: sellingERC721.address,
          identifier: "2"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("10").toString(),
          recipient: signerOneWallet.address,
          token: buyingERC20.address
        }
      ]
    },
    signerOneWallet.address
  );

  let orderWithCounter: OrderWithCounter | undefined = undefined;

  for (const createOrderAction of signerOneOrderActions) {
    if (createOrderAction.type == "approval") {
      await handleApprovalAction(createOrderAction, signerOneWallet);
    } else if (createOrderAction.type == "create") {
      orderWithCounter = await handleCreateOrderAction(createOrderAction, signerOneWallet, addressOneSeaClient);
    }
  }

  // Fill the Order

  const { executeAllActions: signerTwoOrderExecuteAllActions, actions: signerTwoOrderActions } =
    await addressTwoSeaClient.fulfillOrder({
      order: orderWithCounter as OrderWithCounter,
      accountAddress: signerTwoWallet.address
    });

  for (const fillOrderAction of signerTwoOrderActions) {
    if (fillOrderAction.type == "approval") {
      await handleApprovalAction(fillOrderAction, signerTwoWallet);
    } else if (fillOrderAction.type == "exchange") {
      await handleExchangeAction(fillOrderAction, signerTwoWallet);
    }
  }

  // Check
  assert(signerTwoWallet.address == (await sellingERC721.ownerOf(2)), "Invalid Token Owner");
  assert((await buyingERC20.balanceOf(signerOneWallet.address)).toString() == ethers.utils.parseEther("10").toString(), "Invalid Amount");

}

async function handleApprovalAction(approvalAction: any | ApprovalActionCustom, wallet: Wallet) {
  let approvalTx = approvalAction.transactionRequest;
  approvalTx.gasLimit = BigNumber.from("700000");
  approvalTx.gasPrice = BigNumber.from("700000000000");
  approvalTx.nonce = await provider.getTransactionCount(wallet.address);

  const sigApprovalTx = await wallet.signTransaction(approvalTx);

  const sentApprovalTx = await provider.sendTransaction(sigApprovalTx);

  await provider.waitForTransaction(sentApprovalTx.hash);
}

async function handleExchangeAction(exchangeAction: any | ExchangeActionCustom, wallet: Wallet) {
  let exchangeTx = exchangeAction.transactionRequest;
  exchangeTx.gasLimit = BigNumber.from("700000");
  exchangeTx.gasPrice = BigNumber.from("700000000000");
  exchangeTx.nonce = await provider.getTransactionCount(wallet.address);

  const sigExchangeTx = await wallet.signTransaction(exchangeTx);

  const sentExchangeTx = await provider.sendTransaction(sigExchangeTx);

  await provider.waitForTransaction(sentExchangeTx.hash);
}

async function handleCreateOrderAction(createOrderAction: any | CreateOrderAction, wallet: Wallet, seaportClient: SeaportCustom): Promise<OrderWithCounter> {
  let createOrder = await createOrderAction.createOrder();
  const orderMsg = await createOrderAction.getMessageToSign();
  createOrder.signature = await seaportClient.signCreateOrderMessage(wallet, orderMsg);
  return createOrder;
}

async function handleCancelOrdersTransactionRequest(tx: TransactionRequest, wallet: Wallet) {
  tx.gasLimit = BigNumber.from("700000");
  tx.gasPrice = BigNumber.from("700000000000");
  tx.nonce = await provider.getTransactionCount(wallet.address);

  const sigTx = await wallet.signTransaction(tx);

  const sentTx = await provider.sendTransaction(sigTx);

  await provider.waitForTransaction(sentTx.hash);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}