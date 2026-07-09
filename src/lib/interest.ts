import { prisma } from "./db";
import { settleCommissionOnInterest } from "./commission";

// 订单起息日 + dayIndex 天，按 UTC+7 取日期字符串（计息幂等键）
function dateLabel(start: Date, dayIndex: number): string {
  const d = new Date(start.getTime() + dayIndex * 86400000 + 7 * 3600000);
  return d.toISOString().slice(0, 10);
}

// 为某用户的所有在投订单各推进一天计息（到期则返本金）。幂等：unique(orderId, date)。
// 生产由每日 02:00(UTC+7) cron/worker 调用，不暴露给用户端。
export async function tickInterestForUser(
  userId: string
): Promise<{ credited: number; matured: number; days: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "frozen") return { credited: 0, matured: 0, days: 0 };

  const orders = await prisma.investmentOrder.findMany({
    where: { userId, status: "active" },
    include: { _count: { select: { interests: true } } },
  });

  let credited = 0;
  let matured = 0;
  let days = 0;

  for (const o of orders) {
    const dayIndex = o._count.interests; // 已计息天数 = 待计息日 index
    if (dayIndex >= o.periodDays) continue;

    const amount = Number(o.tierAmount) * Number(o.dailyRate);
    const date = dateLabel(o.startedAt, dayIndex);
    const isLast = dayIndex + 1 >= o.periodDays;
    const principal = Number(o.tierAmount);

    await prisma.$transaction(async (tx) => {
      await tx.interestRecord.create({ data: { orderId: o.id, date, amount } });

      const bal = await tx.balance.findUnique({ where: { userId } });
      const before = Number(bal?.available ?? 0);
      const afterInterest = before + amount;
      const finalAvail = isLast ? afterInterest + principal : afterInterest;

      await tx.balance.update({ where: { userId }, data: { available: finalAvail } });
      await tx.investmentOrder.update({
        where: { id: o.id },
        data: { earned: Number(o.earned) + amount, status: isLast ? "matured" : "active" },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          type: "interest",
          amount,
          balanceAfter: afterInterest,
          refId: o.id,
          memo: `订单 ${o.id} 第 ${dayIndex + 1} 天收益`,
        },
      });
      if (isLast) {
        await tx.ledgerEntry.create({
          data: {
            userId,
            type: "principal",
            amount: principal,
            balanceAfter: finalAvail,
            refId: o.id,
            memo: `订单 ${o.id} 到期返本金`,
          },
        });
      }
    });

    // 按下级收益结算级差佣金给上线
    await settleCommissionOnInterest(o.userId, amount, date);

    credited += amount;
    days++;
    if (isLast) matured++;
  }

  return { credited, matured, days };
}
