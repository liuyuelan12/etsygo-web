import { ethers } from "ethers";

export const USDT_DECIMALS = Number(process.env.USDT_DECIMALS ?? "18");
export const BSC_CHAIN_ID = Number(process.env.CHAIN_ID ?? "56");
export const BSC_RPC_URL = process.env.BSC_RPC_URL ?? process.env.NODEREAL_BNB_MAINNET;
export const USDT_ADDRESS =
  process.env.USDT_ADDRESS ?? "0x55d398326f99059ff775485246999027b3197955";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export function getProvider(): ethers.JsonRpcProvider {
  if (!BSC_RPC_URL) throw new Error("BSC_RPC_URL is not configured");
  return new ethers.JsonRpcProvider(BSC_RPC_URL, {
    chainId: BSC_CHAIN_ID,
    name: BSC_CHAIN_ID === 56 ? "bsc" : "bsc-custom",
  });
}

export function getUsdt(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(USDT_ADDRESS, ERC20_ABI, runner);
}

// 运营热钱包(出款)
export function getHotWallet(): ethers.Wallet {
  return new ethers.Wallet(process.env.HOT_WALLET_PK as string, getProvider());
}

// 由 HD 助记词按 index 派生用户专属充值地址
export function deriveDepositAddress(index: number): string {
  return ethers.HDNodeWallet.fromPhrase(
    process.env.DEPOSIT_MNEMONIC as string,
    undefined,
    `m/44'/60'/0'/0/${index}`
  ).address;
}

export const toUsdtUnits = (amount: string | number) =>
  ethers.parseUnits(String(amount), USDT_DECIMALS);
export const fromUsdtUnits = (units: bigint) => ethers.formatUnits(units, USDT_DECIMALS);
