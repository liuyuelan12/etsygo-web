import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { D } from "./money";

// 佣金（动态利息）：级差制，总拨比封顶 50%（依据 代理模式.md）。金额全程 Decimal。
// 投资者本人只拿静态利息，不拿自赚返佣；其上线链自近到远，各拿（自己等级% − 已发累计%）× 该笔静态利息。
// ★ 只生成 CommissionRecord（未领取），不即时入账余额；上线需自行「领取」后才进可用余额（与静态收益一致）。
// 资格：上线是 isAgent 且未冻结即可（哪怕自己一分不投也能拿）。
export async function settleCommissionOnInterest(
  sourceUserId: string,
  interestAmount: Prisma.Decimal,
  date: string,
  sourceOrderId?: string
): Promise<void> {
  if (D(interestAmount).lte(0)) return;

  const ancestors = await prisma.agentRelation.findMany({
    where: { descendantId: sourceUserId },
    orderBy: { depth: "asc" },
  });
  if (ancestors.length === 0) return;

  const configs = await prisma.commissionConfig.findMany();
  const pctByLevel = new Map(configs.map((c) => [c.level, Number(c.pct)]));

  let paidPct = 0;

  for (const a of ancestors) {
    if (paidPct >= 50) break;
    const u = await prisma.user.findUnique({ where: { id: a.ancestorId } });
    if (!u || u.status === "frozen" || !u.isAgent) continue;

    const rankPct = Math.min(pctByLevel.get(u.commissionTier) ?? 0, 50);
    if (rankPct <= paidPct) continue;

    const deltaPct = rankPct - paidPct;
    const amount = D(interestAmount).mul(deltaPct).div(100);
    paidPct = rankPct;

    // 仅记账为"未领取"，不动余额
    await prisma.commissionRecord.create({
      data: { beneficiaryId: u.id, sourceUserId, sourceOrderId, level: u.commissionTier, pct: deltaPct, amount, date },
    });
  }
}

// 上线领取全部未领动态佣金 → 一次性入账可用余额。并发下用 updateMany(claimedAt:null) 原子标记防双领。
export async function claimCommission(userId: string): Promise<{ credited: number; count: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("未登录");
  if (user.status === "frozen") throw new Error("账号已冻结");

  return prisma.$transaction(
    async (tx) => {
      const pending = await tx.commissionRecord.findMany({ where: { beneficiaryId: userId, claimedAt: null } });
      if (pending.length === 0) return { credited: 0, count: 0 };

      const ids = pending.map((r) => r.id);
      const total = pending.reduce((s, r) => s.add(D(r.amount)), D(0));

      // 原子标记这些记录为已领（防并发双领）
      const marked = await tx.commissionRecord.updateMany({ where: { id: { in: ids }, claimedAt: null }, data: { claimedAt: new Date() } });
      if (marked.count !== ids.length) throw new Error("佣金正在处理，请重试");

      await tx.balance.update({ where: { userId }, data: { available: { increment: total } } });
      const newAvail = (await tx.balance.findUnique({ where: { userId } }))!.available;
      await tx.ledgerEntry.create({
        data: { userId, type: "commission", amount: total, balanceAfter: newAvail, refId: userId, memo: `领取动态佣金 ${ids.length} 笔` },
      });
      return { credited: Number(total), count: ids.length };
    },
    { timeout: 20000, maxWait: 10000 }
  );
}
