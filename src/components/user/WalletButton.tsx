"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

// 右上角"连接钱包"按钮（支持 MetaMask/OKX 插件 + 手机钱包 WalletConnect 扫码）
export default function WalletButton() {
  return (
    <ConnectButton
      showBalance={false}
      accountStatus="address"
      chainStatus="none"
      label="连接钱包"
    />
  );
}
