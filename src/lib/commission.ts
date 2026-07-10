import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { D } from "./money";

// 佣金（动态利息）：级差制，总拨比封顶 50%（依据 代理模式.md）。金额全程 Decimal。
// 投资者本人只拿静态利息，不拿自赚返佣；其上线链自近到远，各拿（自己等级% − 已发累计%）× 该笔静态利息。
// 例：乙投 3000 → 乙拿 9 静态；甲(50%)是乙上线 → 甲拿 9×50%=4.5。
//     丙(乙的下级)投 3000 → 丙拿 9 静态；乙(35%)拿 9×35%=3.15，甲(50%)拿 9×(50−35)%=1.35。
// 资格：上线是 isAgent 且未冻结即可（哪怕自己一分不投也能拿）。
export async function settleCommissionOnInterest(
  sourceUserId: string,
  interestAmount: Prisma.Decimal,
  date: string,
  sourceOrderId?: string
): Promise<void> {
  if (D(interestAmount).lte(0)) return;

  // 上线链，由近到远（不含投资者本人）
  const ancestors = await prisma.agentRelation.findMany({
    where: { descendantId: sourceUserId },
    orderBy: { depth: "asc" },
  });
  if (ancestors.length === 0) return;

  const configs = await prisma.commissionConfig.findMany();
  const pctByLevel = new Map(configs.map((c) => [c.level, Number(c.pct)]));

  let paidPct = 0; // 已发累计百分比（0..50，均为 5 的倍数，无精度问题）

  for (const a of ancestors) {
    if (paidPct >= 50) break;
    const u = await prisma.user.findUnique({ where: { id: a.ancestorId } });
    if (!u || u.status === "frozen" || !u.isAgent) continue; // 冻结/非代理不参与

    const rankPct = Math.min(pctByLevel.get(u.commissionTier) ?? 0, 50);
    if (rankPct <= paidPct) continue; // 级差：不高于已发累计则不发

    const deltaPct = rankPct - paidPct;
    const amount = D(interestAmount).mul(deltaPct).div(100); // Decimal 精确
    paidPct = rankPct;

    await prisma.$transaction(
      async (tx) => {
        await tx.balance.update({ where: { userId: u.id }, data: { available: { increment: amount } } });
        const newAvail = (await tx.balance.findUnique({ where: { userId: u.id } }))!.available;
        await tx.ledgerEntry.create({
          data: { userId: u.id, type: "commission", amount, balanceAfter: newAvail, refId: sourceUserId, memo: `下级收益佣金 级差 ${deltaPct}%` },
        });
        await tx.commissionRecord.create({
          data: { beneficiaryId: u.id, sourceUserId, sourceOrderId, level: u.commissionTier, pct: deltaPct, amount, date },
        });
      },
      { timeout: 20000, maxWait: 10000 }
    );
  }
}
