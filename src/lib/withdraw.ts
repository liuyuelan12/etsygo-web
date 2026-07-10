import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { D } from "./money";
import { getHotWallet, getUsdt, toUsdtUnits } from "./chain";
import { getSettingJson } from "./settings";

type Bal = { available: unknown; totalInvested: unknown; usedWithdraw: unknown; locked: unknown };

export function feeFor(registeredAt: Date, amount: Prisma.Decimal.Value): { fee: Prisma.Decimal; reason: string } {
  const days = (Date.now() - registeredAt.getTime()) / 86400000;
  if (days >= 30) return { fee: D(0), reason: "满 30 天免手续费" };
  return { fee: D(amount).mul(0.05), reason: "注册未满 30 天 · 5%" };
}

// 可提现余额 = 当前可用余额（老板 2026-07-06 定：去掉 120% 上限）。
export function maxWithdrawable(bal: Bal): number {
  return Math.max(0, Number(bal.available));
}

export async function applyWithdraw(userId: string, amount: number, toAddress: string) {
  const amt = D(amount);
  if (amt.lte(0)) throw new Error("金额无效");
  if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) throw new Error("提现地址格式不正确");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { balance: true } });
  if (!user || !user.balance) throw new Error("未登录");
  if (user.status === "frozen") throw new Error("账号已冻结，不可提现");

  const enforce = await getSettingJson<boolean>("withdraw.enforceWindow", true);
  if (enforce) {
    const cfg = await getSettingJson("withdraw.window", { days: [1, 15], startHour: 10, endHour: 22 });
    const vn = new Date(Date.now() + 7 * 3600000);
    if (!cfg.days.includes(vn.getUTCDate()) || vn.getUTCHours() < cfg.startHour || vn.getUTCHours() >= cfg.endHour) {
      throw new Error("当前不在提现窗口（每月 1 / 15 日 10:00–22:00 越南时间）");
    }
  }

  const { fee, reason } = feeFor(user.registeredAt, amt);

  return prisma.$transaction(async (tx) => {
    const changed = await tx.balance.updateMany({
      where: { userId, available: { gte: amt } },
      data: { available: { decrement: amt }, locked: { increment: amt } },
    });
    if (changed.count !== 1) {
      const bal = await tx.balance.findUnique({ where: { userId } });
      const max = maxWithdrawable(bal ?? { available: 0, totalInvested: 0, usedWithdraw: 0, locked: 0 });
      throw new Error(`超出可提现上限（≤ ${max.toFixed(2)} U）`);
    }
    const newAvail = (await tx.balance.findUnique({ where: { userId } }))!.available;
    const w = await tx.withdrawOrder.create({
      data: { userId, amount: amt, fee, feeReason: reason, toAddress, status: "pending" },
    });
    await tx.ledgerEntry.create({
      data: { userId, type: "withdraw", amount: amt.neg(), balanceAfter: newAvail, refId: w.id, memo: `提现申请 ${amt.toFixed(2)}U` },
    });
    return w.id;
  });
}

export async function cancelWithdraw(userId: string, id: string) {
  const w = await prisma.withdrawOrder.findUnique({ where: { id } });
  if (!w || w.userId !== userId) throw new Error("订单不存在");
  if (w.status !== "pending") throw new Error("仅审核中可取消");
  await refundLocked(userId, id, w.amount, "canceled", "提现取消退回");
}

export async function rejectWithdraw(id: string, reviewer: string) {
  const w = await prisma.withdrawOrder.findUnique({ where: { id } });
  if (!w) throw new Error("订单不存在");
  if (w.status !== "pending") throw new Error("仅审核中可驳回");
  await refundLocked(w.userId, id, w.amount, "rejected", "提现驳回退回", reviewer);
}

async function refundLocked(
  userId: string,
  id: string,
  amount: Prisma.Decimal,
  status: "canceled" | "rejected",
  memo: string,
  reviewer?: string
) {
  const amt = D(amount);
  await prisma.$transaction(async (tx) => {
    await tx.balance.update({ where: { userId }, data: { available: { increment: amt }, locked: { decrement: amt } } });
    const newAvail = (await tx.balance.findUnique({ where: { userId } }))!.available;
    await tx.withdrawOrder.update({ where: { id }, data: { status, reviewedBy: reviewer, reviewedAt: reviewer ? new Date() : undefined } });
    await tx.ledgerEntry.create({ data: { userId, type: "withdraw_refund", amount: amt, balanceAfter: newAvail, refId: id, memo } });
    if (reviewer) {
      await tx.operationLog.create({ data: { operator: reviewer, action: "驳回提现", target: id, before: "审核中", after: "已驳回" } });
    }
  });
}

// 审核通过 → 链上出款（热钱包转 net = amount − fee 到用户地址）
export async function approveWithdraw(id: string, reviewer: string): Promise<string> {
  const w = await prisma.withdrawOrder.findUnique({ where: { id } });
  if (!w) throw new Error("订单不存在");
  if (w.status !== "pending") throw new Error("仅审核中可通过");

  const locked = await prisma.withdrawOrder.updateMany({
    where: { id, status: "pending" },
    data: { status: "approved", reviewedBy: reviewer, reviewedAt: new Date() },
  });
  if (locked.count !== 1) throw new Error("该提现订单正在处理或状态已变化");

  const net = D(w.amount).sub(w.fee);
  const usdt = getUsdt(getHotWallet());
  let txHash = "";
  try {
    const tx = await usdt.transfer(w.toAddress, toUsdtUnits(net.toFixed(6)));
    txHash = tx.hash;
    await tx.wait();
  } catch (e) {
    await prisma.withdrawOrder.update({ where: { id }, data: { status: "pending", reviewedBy: null, reviewedAt: null } });
    throw e;
  }

  await prisma.$transaction(async (db) => {
    await db.balance.update({
      where: { userId: w.userId },
      data: { locked: { decrement: D(w.amount) }, usedWithdraw: { increment: D(w.amount) } },
    });
    await db.withdrawOrder.update({ where: { id }, data: { status: "paid", txHash, reviewedBy: reviewer, reviewedAt: new Date() } });
    await db.chainTx.create({ data: { txHash, type: "payout", userId: w.userId, amount: net, toAddress: w.toAddress, status: "confirmed" } });
    await db.operationLog.create({ data: { operator: reviewer, action: "通过提现", target: id, before: "审核中", after: "已到账" } });
  });
  return txHash;
}
