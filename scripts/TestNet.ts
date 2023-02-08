import { ethers } from "hardhat";

import * as seajs from "@opensea/seaport-js";

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

let signers;
let deployerSigner: SignerWithAddress;
let bobSigner: SignerWithAddress;
let clarkSigner: SignerWithAddress;

let bobSignerSeaClient: seajs.Seaport;
let clarkSignerSeaClient: seajs.Seaport;

const conduitControllerAddress = "0xd4e4E6A7d9f4CD097B84aEbfB033eF8b14C5460c";
const seaportAddress = "0xfdeCddcafAe669BBddD555333C1b3A08Da5b7Eca";
const testERC721Address = "0x8e2ad5E073a44068103eEeF16fF5E3b3d8367253";

let conduitControllerFactory: ConduitController__factory;
let conduitController: ConduitController;

let seaportFactory: Seaport__factory;
let seaport: Seaport;

let testERC721Factory: TestERC721__factory;
let testERC721: TestERC721;

async function setupSigners() {
  signers = await ethers.getSigners();

  deployerSigner = signers[0];
  bobSigner = signers[1];
  clarkSigner = signers[2];

  console.log("deployer Address: ", deployerSigner.address);
  console.log("clark Address: ", clarkSigner.address);
  console.log("bob Address: ", bobSigner.address);
}

async function createClients() {
  const provider = ethers.getDefaultProvider();
  bobSignerSeaClient = new seajs.Seaport(bobSigner, {
    overrides: {
      contractAddress: seaport.address
    }
  });

  clarkSignerSeaClient = new seajs.Seaport(clarkSigner, {
    overrides: {
      contractAddress: seaport.address
    }
  });
}

async function createERC721OrderAndFullfill(tokenId: string) {
  const { executeAllActions: signerOneOrderOneAction, actions } = await bobSignerSeaClient.createOrder({
      offer: [
        {
          itemType: ItemType.ERC721,
          token: testERC721.address,
          identifier: tokenId

        }
      ],
      consideration: [
        {
          amount: ethers.utils.parseEther("0.02").toString(),
          recipient: bobSigner.address
        }
      ]
    },
    bobSigner.address
  );

  const orderOne = await signerOneOrderOneAction();

  await delay(2000);

  console.log((await bobSignerSeaClient.getOrderStatus((await bobSignerSeaClient.getOrderHash(orderOne.parameters)))));

  const { executeAllActions: singerTwoAllFulfillOneActions, actions: fillAction } =
    await clarkSignerSeaClient.fulfillOrder({
      order: orderOne,
      accountAddress: clarkSigner.address
    });

  console.log("Full Action");
  console.log(fillAction);

  const singerTwoAllFulfillOneTransaction = await singerTwoAllFulfillOneActions();

  await delay(2000);

  console.log((await clarkSignerSeaClient.getOrderStatus((await clarkSignerSeaClient.getOrderHash(orderOne.parameters)))));

}

async function main() {
  await setupSigners();
  await setupConduitController(conduitControllerAddress);
  await setupSeaport(seaportAddress);
  await setupTestERC721(testERC721Address);
  await createClients();

  await createERC721OrderAndFullfill("1");

  // await mintERC721Token(bobSigner, 1);
  // await mintERC721Token(bobSigner, 2);
}

async function mintERC721Token(signer: SignerWithAddress, tokenId: number) {
  const mintTx = await testERC721.connect(signer).mint(signer.address, tokenId);
  await mintTx.wait();

  await delay(2000);

  console.log("Token Id: ", tokenId);

  console.log("Token Owner: ", (await testERC721.ownerOf(tokenId)));
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deployConduitController() {
  conduitControllerFactory = await ethers.getContractFactory("ConduitController");
  conduitController = await conduitControllerFactory.connect(deployerSigner).deploy({});
  await conduitController.deployed();

  console.log("conduitController: ", conduitController.address);
}

async function setupConduitController(address: string) {
  conduitControllerFactory = await ethers.getContractFactory("ConduitController");
  conduitController = conduitControllerFactory.attach(address);

  console.log("conduitController: ", conduitController.address);
}

async function deploySeaport(conduitControllerAddress: string) {
  const seaportFactory: Seaport__factory = await ethers.getContractFactory("Seaport");
  seaport = await seaportFactory.connect(deployerSigner).deploy(conduitControllerAddress);
  await seaport.deployed();

  console.log("Seaport: ", seaport.address);
}

async function setupSeaport(seaportAddress: string) {
  const seaportFactory: Seaport__factory = await ethers.getContractFactory("Seaport");
  seaport = seaportFactory.attach(seaportAddress);

  console.log("Seaport: ", seaport.address);
}

async function deployTestERC721() {
  testERC721Factory = await ethers.getContractFactory("TestERC721");
  testERC721 = await testERC721Factory.connect(deployerSigner).deploy();
  await testERC721.deployed();

  console.log("TestERC721: ", testERC721.address);
}

async function setupTestERC721(testERC721Address: string) {
  testERC721Factory = await ethers.getContractFactory("TestERC721");
  testERC721 = testERC721Factory.attach(testERC721Address);

  console.log("TestERC721: ", testERC721.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});