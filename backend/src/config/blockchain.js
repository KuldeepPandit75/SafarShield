import { JsonRpcProvider, Wallet, Contract } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.TOURIST_CONTRACT_ADDRESS;

// Provider (ethers v6 style)
export const provider = new JsonRpcProvider(RPC_URL);

// Wallet
export const wallet = new Wallet(PRIVATE_KEY, provider);

// ABI
export const ABI = [
  "function registerTourist(address,string,string,string)",
  "function verifyTourist(address) view returns(bool)",
  "function getTourist(address) view returns(string,string,uint256,bool)",
];

// Contract
export const contract = new Contract(CONTRACT_ADDRESS, ABI, wallet);
