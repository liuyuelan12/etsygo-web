import { ethers } from "ethers";
import { prisma } from "./db";
import { D } from "./money";
import { getProvider, getUsdt, getHotWallet, fromUsdtUnits } from "./chain";

// 归集(sweep)：把各用户专属地址里的 USDT 转进热钱包，供提现出款。
// 流程（每个有余额的地址）：热钱包先给它打一点 BNB(gas) → 用该地址的派生私钥把 USDT 全额转回热钱包。
// 不改任何用户账本（用户入金时已入账）；这只是把链上真金归拢到热钱包，属内部资金调度。
export async function sweepDeposits(): Promise<{ swept: number; total: string; topups: number }> {
  const mnemonic = process.env.DEPOSIT_MNEMONIC;
  if (!mnemonic) throw new Error("DEPOSIT_MNEMONIC 未配置");

  const provider = getProvider();
  const usdt = getUsdt(provider);
  const hot = getHotWallet();
  const hotAddr = await hot.getAddress();

  const minSweep = D(process.env.SWEEP_MIN_USDT ?? "1"); // 少于此不归集(省 gas)
  const gasTopup = ethers.parseEther(process.env.SWEEP_GAS_BNB ?? "0.0006"); // 每次补的 gas

  const users = await prisma.user.findMany({
    where: { depositAddress: { not: null }, depositIndex: { not: null } },
    select: { id: true, email: true, depositAddress: true, depositIndex: true },
  });

  let swept = 0;
  let topups = 0;
  let total = D(0);

  for (const u of users) {
    try {
      const raw: bigint = await usdt.balanceOf(u.depositAddress!);
      const balDec = D(fromUsdtUnits(raw));
      if (balDec.lt(minSweep)) continue;

      // 用 index 重新派生该地址的钱包，并核对地址一致（安全校验）
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${u.depositIndex}`).connect(provider);
      if ((await wallet.getAddress()).toLowerCase() !== u.depositAddress!.toLowerCase()) {
        console.error(`[sweep] 派生地址与库中不一致，跳过 ${u.email}`);
        continue;
      }

      // gas 不足则由热钱包补一点 BNB
      const bnb = await provider.getBalance(u.depositAddress!);
      if (bnb < gasTopup) {
        const topup = await hot.sendTransaction({ to: u.depositAddress!, value: gasTopup });
        await topup.wait();
        topups++;
      }

      // 用该地址的私钥把 USDT 全额转回热钱包
      const usdtFrom = getUsdt(wallet);
      const tx = await usdtFrom.transfer(hotAddr, raw);
      await tx.wait();

      swept++;
      total = total.add(balDec);
      await prisma.operationLog.create({
        data: { operator: "system:sweep", action: "归集入金", target: u.depositAddress!, before: `${balDec.toFixed(2)} USDT`, after: `→ ${hotAddr}` },
      });
      console.log(`[sweep] ${u.email} ${balDec.toFixed(2)} USDT → 热钱包 tx=${tx.hash}`);
    } catch (e) {
      console.error(`[sweep] ${u.email} 归集失败:`, (e as Error).message);
    }
  }
  return { swept, total: total.toFixed(6), topups };
}

let started = false;
export function startSweeper(): void {
  if (started) return;
  started = true;
  const interval = Number(process.env.SWEEP_POLL_MS ?? "300000"); // 默认 5 分钟一轮
  const loop = async () => {
    try {
      await sweepDeposits();
    } catch (e) {
      console.error("[sweeper]", (e as Error).message);
    } finally {
      setTimeout(loop, interval);
    }
  };
  console.log(`[sweeper] 已启动，每 ${interval}ms 归集一轮`);
  setTimeout(loop, 30000); // 启动后延迟 30s 开跑
}
