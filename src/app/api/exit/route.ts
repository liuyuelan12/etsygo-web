import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// 提前退出（违约）：扣本金 30%，返还 70% 到可用余额；已发收益不追回。
export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z.object({ orderId: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return Response.json({ error: "未登录" }, { status: 401 });
  if (user.status === "frozen") return Response.json({ error: "账号已冻结" }, { status: 403 });

  const order = await prisma.investmentOrder.findUnique({ where: { id: parsed.data.orderId } });
  if (!order || order.userId !== uid) return Response.json({ error: "订单不存在" }, { status: 404 });
  if (order.status !== "active") return Response.json({ error: "该订单不可退出" }, { status: 400 });

  const principal = Number(order.tierAmount);
  const refund = principal * 0.7;
  const penalty = principal * 0.3;

  await prisma.$transaction(async (tx) => {
    const changed = await tx.investmentOrder.updateMany({
      where: { id: order.id, userId: uid, status: "active" },
      data: { status: "exited" },
    });
    if (changed.count !== 1) throw new Error("该订单不可退出");

    await tx.balance.update({
      where: { userId: uid },
      data: { available: { increment: refund }, totalInvested: { decrement: principal } },
    });
    const bal = await tx.balance.findUnique({ where: { userId: uid } });
    const newAvail = Number(bal?.available ?? refund);
    await tx.ledgerEntry.create({
      data: { userId: uid, type: "principal", amount: refund, balanceAfter: newAvail, refId: order.id, memo: `提前退出返本70%（违约金30%=${penalty}）` },
    });
    await tx.operationLog.create({
      data: { operator: `user:${uid}`, action: "提前退出", target: order.id, before: "营业中", after: `已退出·扣违约金${penalty}` },
    });
  });

  return Response.json({ ok: true, refund, penalty });
}
