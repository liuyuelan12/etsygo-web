import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { settleCommissionOnInterest } from "./commission";

// 订单起息日 + dayIndex 天，按 UTC+7 取日期字符串（计息幂等键）
function dateLabel(start: Date, dayIndex: number): string {
  const d = new Date(start.getTime() + dayIndex * 86400000 + 7 * 3600000);
  return d.toISOString().slice(0, 10);
}

type CreditableOrder = {
  id: string;
  userId: string;
  tierAmount: Prisma.Decimal;
  dailyRate: Prisma.Decimal;
  periodDays: number;
  startedAt: Date;
};

// 给单个订单发放"第 dayIndex 天"收益（末日额外返本金并置 matured）。
// 幂等键 unique(orderId,date)；余额/earned 用原子 increment，避免读-改-写丢更新。
// 事务成功后再结算上线级差佣金（带 sourceOrderId → 佣金可按订单明细）。
export async function creditOrderDay(order: CreditableOrder, dayIndex: number): Promise<{ amount: number; isLast: boolean }> {
  const amount = Number(order.tierAmount) * Number(order.dailyRate);
  const date = dateLabel(order.startedAt, dayIndex);
  const isLast = dayIndex + 1 >= order.periodDays;
  const principal = Number(order.tierAmount);
  const userId = order.userId;

  await prisma.$transaction(async (tx) => {
    // unique(orderId,date) 保证同订单同"日"只发一次；重复领取在此抛 P2002。
    await tx.interestRecord.create({ data: { orderId: order.id, date, amount } });

    await tx.balance.update({ where: { userId }, data: { available: { increment: amount } } });
    const afterInterest = Number((await tx.balance.findUnique({ where: { userId } }))?.available ?? 0);
    await tx.investmentOrder.update({
      where: { id: order.id },
      data: { earned: { increment: amount }, status: isLast ? "matured" : "active" },
    });
    await tx.ledgerEntry.create({
      data: { userId, type: "interest", amount, balanceAfter: afterInterest, refId: order.id, memo: `订单 ${order.id} 第 ${dayIndex + 1} 天收益` },
    });

    if (isLast) {
      await tx.balance.update({ where: { userId }, data: { available: { increment: principal } } });
      const finalAvail = Number((await tx.balance.findUnique({ where: { userId } }))?.available ?? 0);
      await tx.ledgerEntry.create({
        data: { userId, type: "principal", amount: principal, balanceAfter: finalAvail, refId: order.id, memo: `订单 ${order.id} 到期返本金` },
      });
    }
  });

  // 按下级收益结算级差佣金给上线（带来源订单 id）
  await settleCommissionOnInterest(order.userId, amount, date, order.id);
  return { amount, isLast };
}

function isDuplicateDay(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// 用户按单手动领取：只发放"投资起已满整 24h、且尚未计息"的天数（老板口径：投资 24h 后每天可领一次）。
// creditedDays = 已计息条数；elapsedDays = floor((now-startedAt)/24h) 上限 periodDays。
export async function claimInterestForOrder(
  userId: string,
  orderId: string
): Promise<{ credited: number; days: number; matured: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("未登录");
  if (user.status === "frozen") throw new Error("账号已冻结");

  const order = await prisma.investmentOrder.findUnique({
    where: { id: orderId },
    include: { _count: { select: { interests: true } } },
  });
  if (!order || order.userId !== userId) throw new Error("订单不存在");
  if (order.status !== "active") throw new Error("该订单不可领取");

  const creditedDays = order._count.interests;
  const elapsedDays = Math.min(order.periodDays, Math.floor((Date.now() - order.startedAt.getTime()) / 86400000));

  let credited = 0;
  let days = 0;
  let matured = false;
  for (let d = creditedDays; d < elapsedDays; d++) {
    try {
      const { amount, isLast } = await creditOrderDay(order, d);
      credited += amount;
      days++;
      if (isLast) {
        matured = true;
        break;
      }
    } catch (e) {
      if (isDuplicateDay(e)) break; // 并发被其它请求领走，停止
      throw e;
    }
  }
  return { credited, days, matured };
}

// 为某用户的所有在投订单各推进一天计息（幂等）。保留给未来每日 cron/worker 调用，不暴露给用户端。
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
    const dayIndex = o._count.interests;
    if (dayIndex >= o.periodDays) continue;
    const { amount, isLast } = await creditOrderDay(o, dayIndex);
    credited += amount;
    days++;
    if (isLast) matured++;
  }

  return { credited, matured, days };
}
