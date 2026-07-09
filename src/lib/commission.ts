import { prisma } from "./db";

// 佣金：级差制 + 自赚返佣（老板 2026-07-06 拍板：总拨比固定 50%）。
// 处理顺序：先"赚钱者自己"（自赚返佣 = 自己的等级%），再沿上线链自近到远。
// 每个代理拿 =（自己等级% − 已发累计%），累计封顶 50%（最高代理 = 顶级）。
// 例：乙(40%)自己赚 → 乙拿 40（自赚），甲(50%)拿 50−40=10（级差），合计 50%。
//     底层普通用户赚 → 本人非代理不返，上线链各拿级差，合计封顶 50%。
// 资格：isAgent 且 totalInvested≥300 且未冻结。
export async function settleCommissionOnInterest(
  sourceUserId: string,
  interestAmount: number,
  date: string
): Promise<number> {
  if (interestAmount <= 0) return 0;

  const ancestors = await prisma.agentRelation.findMany({
    where: { descendantId: sourceUserId },
    orderBy: { depth: "asc" },
  });

  const configs = await prisma.commissionConfig.findMany();
  const pctByLevel = new Map(configs.map((c) => [c.level, Number(c.pct)]));

  // 分配链：赚钱者本人（自赚返佣）在最前，其后是上线链（由近到远）。
  const chain: { userId: string; self: boolean }[] = [
    { userId: sourceUserId, self: true },
    ...ancestors.map((a) => ({ userId: a.ancestorId, self: false })),
  ];

  let paidPct = 0;
  let total = 0;

  for (const node of chain) {
    if (paidPct >= 50) break;
    const u = await prisma.user.findUnique({ where: { id: node.userId }, include: { balance: true } });
    if (!u || u.status === "frozen") continue;
    if (!u.isAgent) continue; // 非代理不参与（本人不是代理则无自赚返佣）
    if (Number(u.balance?.totalInvested ?? 0) < 300) continue; // 未达代理资格

    const rankPct = Math.min(pctByLevel.get(u.commissionTier) ?? 0, 50);
    if (rankPct <= paidPct) continue; // 级差：不高于已发累计则不发

    const deltaPct = rankPct - paidPct;
    const amount = interestAmount * (deltaPct / 100);
    paidPct = rankPct;

    await prisma.$transaction(async (tx) => {
      const bal = await tx.balance.findUnique({ where: { userId: node.userId } });
      const newAvail = Number(bal!.available) + amount;
      await tx.balance.update({ where: { userId: node.userId }, data: { available: newAvail } });
      await tx.ledgerEntry.create({
        data: {
          userId: node.userId,
          type: "commission",
          amount,
          balanceAfter: newAvail,
          refId: sourceUserId,
          memo: node.self ? `自赚返佣 ${deltaPct}%` : `下级收益佣金 级差 ${deltaPct}%`,
        },
      });
      await tx.commissionRecord.create({
        data: { beneficiaryId: node.userId, sourceUserId, level: u.commissionTier, pct: deltaPct, amount, date },
      });
    });
    total += amount;
  }
  return total;
}
