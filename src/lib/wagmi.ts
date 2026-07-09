import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc } from "wagmi/chains";

// 连接钱包配置：BNB Smart Chain mainnet（chain 56）。projectId 来自 Reown（客户端可见）。
export const wagmiConfig = getDefaultConfig({
  appName: "EtsyGo",
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "",
  chains: [bsc],
  ssr: true,
});

export const USDT_ADDRESS = (
  process.env.NEXT_PUBLIC_USDT_ADDRESS ?? "0x55d398326f99059ff775485246999027b3197955"
) as `0x${string}`;
