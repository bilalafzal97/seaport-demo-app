import { ethers } from "hardhat";

import * as seajs from "@opensea/seaport-js";
import { ApprovalAction, CreateOrderAction } from "@opensea/seaport-js/lib/types";

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
import { Wallet } from "ethers";
import { TransactionRequest } from "@ethersproject/providers";

let conduitController: ConduitController;
let seaport: Seaport;
let testERC20: TestERC20;
let testERC721: TestERC721;
let testERC721_2: TestERC721;
let testERC1155: TestERC1155;
let signerOneSeaClient: seajs.Seaport;
let signerTwoSeaClient: seajs.Seaport;
let singerOne: SignerWithAddress;
let singerTwo: SignerWithAddress;
let singerThree: SignerWithAddress;
let signerOneWallet: Wallet;

let provider = ethers.provider;

async function main() {
  console.log("Hello World");
  await deployContractFromFile();
  await deployConduitController();
  await deploySeaport();
  await deployTestERC();
  await mintTestNFTs();
  await createClients();
  // await createERC721For721OrderAndFullfill();
  // await createERC721OrderAndFullfill();
  await getBalance();
  await createERC721OrderAndCancelled();
  // await createERC1155OrderAndFullfill();
  // await createERC1155OrderAndCanceled();
  await createERC721OrderAndFullfillWithToken();
  await createERC721OrderAndFullfillWithTokenWithFee();
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
  testERC20 = await testERC20Factory.deploy();
  await testERC20.deployed();
  console.log("TestERC20: ", testERC20.address);

  const testERC721Factory: TestERC721__factory = await ethers.getContractFactory("TestERC721");
  testERC721 = await testERC721Factory.deploy();
  await testERC721.deployed();
  console.log("TestERC721: ", testERC721.address);

  testERC721_2 = await testERC721Factory.deploy();
  await testERC721_2.deployed();
  console.log("testERC721_2: ", testERC721_2.address);

  const testERC1155Factory: TestERC1155__factory = await ethers.getContractFactory("TestERC1155");
  testERC1155 = await testERC1155Factory.deploy();
  await testERC1155.deployed();
  console.log("TestERC1155: ", testERC1155.address);
}

async function mintTestNFTs() {
  let testERC721Mint1 = await testERC721.mint((await ethers.getSigners())[1].address, 1);
  let testERC721Mint2 = await testERC721.mint((await ethers.getSigners())[1].address, 2);
  let testERC721Mint3 = await testERC721.mint((await ethers.getSigners())[1].address, 3);
  let testERC721Mint4 = await testERC721.mint((await ethers.getSigners())[1].address, 4);

  await testERC721Mint1.wait();
  await testERC721Mint2.wait();
  await testERC721Mint3.wait();
  await testERC721Mint4.wait();

  let testERC721Mint2_1 = await testERC721_2.mint((await ethers.getSigners())[2].address, 1);
  await testERC721Mint2_1.wait();

  let testERC1155Mint1 = await testERC1155.mint((await ethers.getSigners())[1].address, 1, 20);
  let testERC1155Mint2 = await testERC1155.mint((await ethers.getSigners())[1].address, 2, 20);

  await testERC1155Mint1.wait();
  await testERC1155Mint2.wait();

  const testERC20Mint = await testERC20.mint((await ethers.getSigners())[2].address, ethers.utils.parseEther("10").toString());
  await testERC20Mint.wait();

  await delay(1000);

  console.log("Test Url: ", (await testERC721.tokenURI(1)));
}

async function createClients() {
  const provider = ethers.provider;

  singerOne = await ethers.getSigner((await ethers.getSigners())[1].address);

  signerOneSeaClient = new seajs.Seaport(singerOne, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  singerTwo = await ethers.getSigner((await ethers.getSigners())[2].address);
  signerTwoSeaClient = new seajs.Seaport(singerTwo, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  singerThree = await ethers.getSigner((await ethers.getSigners())[3].address);
}

async function getBalance() {
  const p = new ethers.providers.JsonRpcProvider("https://convincing-lingering-season.matic.quiknode.pro/380138af8e14b8fd6724ed4edb52c9d8fe074f8c/");

// await p.detectNetwork();

  console.log("Balance: ", (await p.getBalance(singerTwo.address)));

  console.log("Gas price: ", (await p.getGasPrice()));

  // console.log("Balance: ", (await provider.getBalance(singerTwo.address)));
  //
  // const tx: TransactionRequest = {
  //   from: singerOne.address,
  //   to: singerTwo.address,
  //   value: ethers.utils.parseEther("2")
  // }
  //
  // console.log("Signer Address: ", singerOne.address);
  //
  // // const sigTx = await singerOne.signTransaction(tx);
  //
  // // const txRe = await provider.sendTransaction(sigTx);
  //
  // console.log("Balance 2: ", (await provider.getBalance(singerTwo.address)));
}

async function createERC721For721OrderAndFullfill() {
  const { executeAllActions: signerOneOrderOneAction, actions } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: "1"

        }
      ],
      consideration: [
        {
          recipient: singerOne.address,
          itemType: ItemType.ERC721,
          identifier: "1",
          token: testERC721_2.address
        },

      ]
    },
    singerOne.address
  );

  console.log("ss: ", await testERC721.isApprovedForAll(singerOne.address, seaport.address))

  const orderOne = await signerOneOrderOneAction();

  console.log("ownwe : ", (await testERC721_2.ownerOf(1)));
  console.log("ownwe : ", singerTwo.address);

  // const sss = actions[0] as ApprovalAction;
  //
  // const dddd = actions[1] as CreateOrderAction;
  //
  // console.log("order Message: ", await dddd.getMessageToSign());
  //
  // console.log("ss: ", await testERC721.isApprovedForAll(singerOne.address, seaport.address))


  // signerOneSeaClient.contract.signer.provider?.getTransaction(((await sss.transactionMethods.transact()).hash))

  // console.log((await sss.transactionMethods.transact()));
//   console.log(orderOne);
// console.log(signerOneSeaClient.contract.address)

  // await delay(1000);
  //
  // console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));
  //
  const { executeAllActions: singerTwoAllFulfillOneActions, actions: fillAction } =
    await signerTwoSeaClient.fulfillOrder({
      order: orderOne,
      accountAddress: singerTwo.address
    });

  console.log("Full Action");
  console.log(fillAction);

  const singerTwoAllFulfillOneTransaction = await singerTwoAllFulfillOneActions();
  //
  // await delay(1000);
  //
  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

  console.log("ownwe : ", (await testERC721_2.ownerOf(1)));
  console.log("ownwe : ", singerTwo.address);
  console.log("ownwe : ", singerOne.address);
}

async function createERC721OrderAndFullfill() {
  const { executeAllActions: signerOneOrderOneAction, actions } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: "1"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: singerOne.address
        }
      ]
    },
    singerOne.address
  );

  console.log("ss: ", await testERC721.isApprovedForAll(singerOne.address, seaport.address))

  // const orderOne = await signerOneOrderOneAction();

  const sss = actions[0] as ApprovalAction;

  const dddd = actions[1] as CreateOrderAction;

  console.log("order Message: ", await dddd.getMessageToSign());

  console.log("ss: ", await testERC721.isApprovedForAll(singerOne.address, seaport.address))


  // signerOneSeaClient.contract.signer.provider?.getTransaction(((await sss.transactionMethods.transact()).hash))

  // console.log((await sss.transactionMethods.transact()));
//   console.log(orderOne);
// console.log(signerOneSeaClient.contract.address)

  // await delay(1000);
  //
  // console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));
  //
  // const { executeAllActions: singerTwoAllFulfillOneActions, actions: fillAction } =
  //   await signerTwoSeaClient.fulfillOrder({
  //     order: orderOne,
  //     accountAddress: singerTwo.address
  //   });
  //
  // console.log("Full Action");
  // console.log(fillAction);
  //
  // const singerTwoAllFulfillOneTransaction = await singerTwoAllFulfillOneActions();
  //
  // await delay(1000);
  //
  // console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

}

async function createERC721OrderAndCancelled() {
  const { executeAllActions: signerOneOrderTwoAction, actions:  signerOneOrderTwoActions} = (await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: "2"

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1").toString(),
          recipient: singerOne.address
        }
      ]
    },
    singerOne.address
  ));

  console.log("Checkingingg ggggggggg");
  // console.log(signerOneOrderTwoAction.)


  // console.log((signerOneOrderTwoAction));
  console.log((signerOneOrderTwoActions.length));
  console.log(signerOneOrderTwoActions);
  // console.log((await signerOneOrderTwoActions[0].getMessageToSign()));

  // const orderTwo = await signerOneOrderTwoAction;
  const orderTwo = await signerOneOrderTwoAction();
  const cancelOrders = await signerOneSeaClient.cancelOrders(
    [orderTwo.parameters],
    orderTwo.parameters.offerer
  ).transact();

  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderTwo.parameters)))));
}

async function createERC1155OrderAndFullfill() {

  const { executeAllActions: signerOneOrderThreeAction } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC1155,
          token: testERC1155.address,
          identifier: "1",
          amount: "5",
        },
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("2").toString(),
          recipient: singerOne.address,
        },
      ],
    allowPartialFills: true
    },
    singerOne.address
  );
  const orderThree = await signerOneOrderThreeAction();

  const { executeAllActions: singerTwoAllFulfillTwoActions } =
    await signerTwoSeaClient.fulfillOrder({
      order: orderThree,
      accountAddress: singerTwo.address,
      unitsToFill: "2"
    });

  const singerTwoAllFulfillTwoActionsTransaction = await singerTwoAllFulfillTwoActions();

  await delay(1000);

  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderThree.parameters)))));

  const { executeAllActions: singerTwoAllFulfillTwoActions2 } =
    await signerTwoSeaClient.fulfillOrder({
      order: orderThree,
      accountAddress: singerTwo.address,
      unitsToFill: "2"
    });

  const singerTwoAllFulfillTwoActionsTransaction2 = await singerTwoAllFulfillTwoActions();

  await delay(1000);

  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderThree.parameters)))));
}

async function createERC1155OrderAndCanceled() {

  const { executeAllActions: signerOneOrderFourAction } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC1155,
          token: testERC1155.address,
          identifier: "2",
          amount: "1"
        },
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("2").toString(),
          recipient: singerOne.address,
        },
      ],
    },
    singerOne.address
  );
  const orderFour = await signerOneOrderFourAction();

  const cancelOrders = await signerOneSeaClient.cancelOrders(
    [orderFour.parameters],
    orderFour.parameters.offerer
  ).transact();
}

async function createERC721OrderAndFullfillWithToken() {
  const { executeAllActions: signerOneOrderOneAction } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: "3"
        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1.5").toString(),
          recipient: singerOne.address,
          token: testERC20.address
        }
      ]
    },
    singerOne.address
  );
  const orderOne = await signerOneOrderOneAction();

  await delay(2000);

  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

  const { executeAllActions: singerTwoAllFulfillOneActions } =
    await signerTwoSeaClient.fulfillOrder({
      order: orderOne,
      accountAddress: singerTwo.address
    });

  const singerTwoAllFulfillOneTransaction = await singerTwoAllFulfillOneActions();

  await delay(1000);

  console.log(await testERC20.balanceOf(singerOne.address));
  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

}

async function createERC721OrderAndFullfillWithTokenWithFee() {
  const { executeAllActions: signerOneOrderOneAction } = await signerOneSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: "4"
        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("1.5").toString(),
          recipient: singerOne.address,
          token: testERC20.address
        }
      ],
      fees: [{ recipient: singerThree.address, basisPoints: 250 }], // 2.5%
    },
    singerOne.address
  );
  const orderOne = await signerOneOrderOneAction();

  await delay(2000);

  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

  const { executeAllActions: singerTwoAllFulfillOneActions } =
    await signerTwoSeaClient.fulfillOrder({
      order: orderOne,
      accountAddress: singerTwo.address
    });

  // const singerTwoAllFulfillOneTransaction = await singerTwoAllFulfillOneActions();

  await delay(1000);

  console.log(await testERC20.balanceOf(singerOne.address));
  console.log(await testERC20.balanceOf(singerThree.address));
  console.log((await signerOneSeaClient.getOrderStatus((await signerOneSeaClient.getOrderHash(orderOne.parameters)))));

}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}