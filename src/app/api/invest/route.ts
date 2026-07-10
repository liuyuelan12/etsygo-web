import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { getTiers } from "@/lib/settings";
import { D } from "@/lib/money";
import { z } from "zod";

const schema = z.object({
  amount: z.number(),
  etsygoShop: z.string().optional(),
});

export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  const { amount, etsygoShop } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: uid }, include: { balance: true } });
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  if (user.status === "frozen") return Response.json({ error: "账号已冻结，不可投资" }, { status: 403 });

  const tier = (await getTiers()).find((t) => t.amount === amount);
  if (!tier) return Response.json({ error: "暂未开放" }, { status: 400 });
  if (tier.mode === "solo" && !etsygoShop?.trim()) {
    return Response.json({ error: "独立店需填写 EtsyGo 店铺名" }, { status: 400 });
  }

  const amt = D(amount);
  const dailyRate = D(tier.dailyRatePct).div(100);
  const now = new Date();
  const maturesAt = new Date(now.getTime() + tier.periodDays * 86400000);
  const shopName = tier.mode === "solo" ? etsygoShop!.trim() : null;

  try {
    await prisma.$transaction(async (tx) => {
      const deducted = await tx.balance.updateMany({
        where: { userId: uid, available: { gte: amt } },
        data: { available: { decrement: amt }, totalInvested: { increment: amt } },
      });
      if (deducted.count !== 1) throw new Error("余额不足，请先充值");
      const newAvail = (await tx.balance.findUnique({ where: { userId: uid } }))!.available;

    const order = await tx.investmentOrder.create({
      data: {
        userId: uid,
        tierAmount: amt,
        mode: tier.mode,
        dailyRate,
        periodDays: tier.periodDays,
        startedAt: now,
        maturesAt,
        etsygoShop: shopName,
      },
    });
    await tx.ledgerEntry.create({
      data: { userId: uid, type: "invest", amount: amt.neg(), balanceAfter: newAvail, refId: order.id, memo: `开店 ${tier.mode === "solo" ? "独立店" : "拼店"} ${amount}U` },
    });
    if (shopName) {
      await tx.user.update({ where: { id: uid }, data: { etsygoShop: shopName } });
    }
    return order.id;
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
