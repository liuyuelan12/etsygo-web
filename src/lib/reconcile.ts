import { prisma } from "./db";
import { D, ZERO } from "./money";

// 对账核心不变量（账本=真相）：
//  1) balance.available === Σ(该用户所有 ledger.amount)  —— 任何 available 变动都必有对应 ledger
//  2) balance.locked    === Σ(该用户 pending 状态提现单金额)
// 任一不成立 = 有漏记/多记/漂移的资金 bug，需人工介入。
export type Mismatch = {
  userId: string;
  email: string;
  available: string;
  ledgerSum: string;
  availDiff: string;
  locked: string;
  pendingWithdraw: string;
  lockDiff: string;
};

export async function reconcileAll(epsilon: string = "0.000001"): Promise<{ checked: number; mismatches: Mismatch[] }> {
  const eps = D(epsilon);

  // 2 条聚合查询搞定全部账户，不做 N+1
  const [balances, ledgerSums, pendingSums] = await Promise.all([
    prisma.balance.findMany({ include: { user: { select: { email: true } } } }),
    prisma.ledgerEntry.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.withdrawOrder.groupBy({ by: ["userId"], where: { status: "pending" }, _sum: { amount: true } }),
  ]);
  const ledgerByUser = new Map(ledgerSums.map((s) => [s.userId, s._sum.amount ?? ZERO]));
  const pendingByUser = new Map(pendingSums.map((s) => [s.userId, s._sum.amount ?? ZERO]));

  const mismatches: Mismatch[] = [];
  for (const b of balances) {
    const available = D(b.available);
    const ledgerSum = D(ledgerByUser.get(b.userId) ?? 0);
    const availDiff = available.sub(ledgerSum).abs();

    const locked = D(b.locked);
    const pending = D(pendingByUser.get(b.userId) ?? 0);
    const lockDiff = locked.sub(pending).abs();

    if (availDiff.gt(eps) || lockDiff.gt(eps)) {
      mismatches.push({
        userId: b.userId,
        email: b.user.email,
        available: available.toFixed(6),
        ledgerSum: ledgerSum.toFixed(6),
        availDiff: availDiff.toFixed(6),
        locked: locked.toFixed(6),
        pendingWithdraw: pending.toFixed(6),
        lockDiff: lockDiff.toFixed(6),
      });
    }
  }
  return { checked: balances.length, mismatches };
}
