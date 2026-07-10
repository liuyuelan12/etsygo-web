import { prisma } from "./db";
import { D } from "./money";
import { getProvider, getUsdt, fromUsdtUnits } from "./chain";

// 扫描打到用户专属充值地址的 USDT Transfer 事件，按 txHash 幂等入账。
// 生产可由常驻 worker 周期调用；用户手动刷新只触发一次安全同步。
export async function syncDeposits(userId: string): Promise<{ credited: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.depositAddress) return { credited: 0 };

  const provider = getProvider();
  const usdt = getUsdt(provider);
  const confirmations = Number(process.env.DEPOSIT_CONFIRMATIONS ?? "12");
  const fromBlock = Number(process.env.DEPOSIT_SCAN_FROM_BLOCK ?? "0");
  const blockStep = Number(process.env.DEPOSIT_SCAN_BLOCK_STEP ?? "5000");
  const currentBlock = await provider.getBlockNumber();
  const safeToBlock = currentBlock - confirmations;
  if (safeToBlock < fromBlock) return { credited: 0 };

  const filter = usdt.filters.Transfer(null, user.depositAddress);
  let credited = D(0);

  for (let start = fromBlock; start <= safeToBlock; start += blockStep) {
    const end = Math.min(start + blockStep - 1, safeToBlock);
    const events = await usdt.queryFilter(filter, start, end);

    for (const event of events) {
      const log = event as unknown as {
        transactionHash: string;
        blockNumber: number;
        args?: { from?: string; to?: string; value?: bigint };
      };
      const txHash = log.transactionHash;
      const amount = D(fromUsdtUnits(log.args?.value ?? BigInt(0)));
      if (!txHash || amount.lte(0)) continue;

      try {
        await prisma.$transaction(async (tx) => {
          const exists = await tx.chainTx.findUnique({ where: { txHash } });
          if (exists) return;

          await tx.balance.update({ where: { userId }, data: { available: { increment: amount } } });
          const newAvail = (await tx.balance.findUnique({ where: { userId } }))!.available;
          await tx.ledgerEntry.create({
            data: {
              userId,
              type: "deposit",
              amount,
              balanceAfter: newAvail,
              refId: txHash,
              memo: `链上充值 ${user.depositAddress}`,
            },
          });
          await tx.chainTx.create({
            data: {
              txHash,
              type: "deposit",
              userId,
              amount,
              fromAddress: log.args?.from,
              toAddress: log.args?.to ?? user.depositAddress,
              confirmations,
              status: "confirmed",
              blockNumber: log.blockNumber,
            },
          });
          credited = credited.add(amount);
        });
      } catch (e) {
        if (!(e instanceof Error) || !e.message.includes("Unique constraint")) throw e;
      }
    }
  }

  return { credited: Number(credited) };
}
