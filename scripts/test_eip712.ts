import { ethers } from "hardhat";
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import { TransactionRequest } from "@ethersproject/providers";
import { BigNumber } from "ethers";

const provider = ethers.provider;
let chainId = 0;

const signer = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

async function main() {
  chainId = (await provider.getNetwork()).chainId;

  await sign_type_data();
  await sign_transaction();
  await sign_message();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function sign_type_data() {
// Define the EIP712 domain separator
  const domain: TypedDataDomain = {
    name: 'My dApp',
    version: '1.0.0',
    chainId: 1, // Replace with the correct chain ID
    verifyingContract: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Replace with the correct contract address
  };

  // Define the data that needs to be signed
  const data = {
    types: {
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' }
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' }
      ]
    },
    domain: domain,
    primaryType: 'Mail',
    message: {
      from: { name: 'Alice', wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
      to: { name: 'Bob', wallet: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      contents: 'Hello, Bob!'
    }
  };

// Sign the data
  const signature = await signer._signTypedData(domain, data.types, data.message);

  console.log("type data signature: ", signature);
}

async function sign_transaction() {
  const tx: TransactionRequest = {
    from: signer.address,
    to: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    gasLimit: BigNumber.from("700000"),
    gasPrice: BigNumber.from("700000000000"),
    nonce: await provider.getTransactionCount(signer.address),
    chainId: chainId
  };

  const sigTx = await signer.signTransaction(tx);

  console.log("transaction signature: ", sigTx);
}

async function sign_message() {
  const message = "Hello World";

  const signature = await signer.signMessage(message);

  console.log("message signature: ", signature);
}
