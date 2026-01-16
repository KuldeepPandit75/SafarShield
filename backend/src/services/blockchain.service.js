import crypto from "crypto";
import { Wallet, parseEther } from "ethers";
import {
  contract,
  provider,
  wallet as systemWallet,
} from "../config/blockchain.js";

// Register new tourist with unique wallet
export async function registerTouristOnChain({ aadhaar, name, phone }) {
  const aadhaarHash = crypto.createHash("sha256").update(aadhaar).digest("hex");

  // Create unique tourist wallet
  const touristWallet = Wallet.createRandom().connect(provider);

  // Fund tourist wallet for gas
  const fundTx = await systemWallet.sendTransaction({
    to: touristWallet.address,
    value: parseEther("0.01"),
  });
  await fundTx.wait();

  // Register tourist using system wallet
  const tx = await contract.registerTourist(
    touristWallet.address,
    aadhaarHash,
    name,
    phone
  );

  await tx.wait();

  return {
    touristId: touristWallet.address,
    name,
    phone,
    aadhaarHash,
    txHash: tx.hash,
  };
}

// Verify tourist
export async function verifyTouristOnChain(touristId) {
  return await contract.verifyTourist(touristId);
}

// Get tourist details
export async function getTouristFromChain(touristId) {
  const data = await contract.getTourist(touristId);

  return {
    name: data[0],
    phone: data[1],
    createdAt: Number(data[2]),
    active: data[3],
  };
}
