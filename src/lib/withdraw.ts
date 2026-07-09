import { prisma } from "./db";
import { getHotWallet, getUsdt, toUsdtUnits } from "./chain";
import { getSettingJson } from "./settings";

type Bal = { available: unknown; totalInvested: unknown; usedWithdraw: unknown; locked: unknown };

export function feeFor(registeredAt: Date, amount: number): { fee: number; reason: string } {
  const days = (Date.now() - registeredAt.getTime()) / 86400000;
  if (days >= 30) return { fee: 0, reason: "满 30 天免手续费" };
  return { fee: amount * 0.05, reason: "注册未满 30 天 · 5%" };
}

// 可提现余额 = 当前可用余额（老板 2026-07-06 定：去掉 120% 上限）。
// available 已 = 闲置充值 + 已发收益 + 到期/提前退出返还的本金；投资中的本金锁在店铺内、不计入 available，故天然不可提（除非提前退出走违约）。
export function maxWithdrawable(bal: Bal): number {
  return Math.max(0, Number(bal.available));
}

export async function applyWithdraw(userId: string, amount: number, toAddress: string) {
  if (amount <= 0) throw new Error("金额无效");
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

  const { fee, reason } = feeFor(user.registeredAt, amount);

  return prisma.$transaction(async (tx) => {
    const changed = await tx.balance.updateMany({
      where: { userId, available: { gte: amount } },
      data: { available: { decrement: amount }, locked: { increment: amount } },
    });
    if (changed.count !== 1) {
      const bal = await tx.balance.findUnique({ where: { userId } });
      const max = maxWithdrawable(bal ?? { available: 0, totalInvested: 0, usedWithdraw: 0, locked: 0 });
      throw new Error(`超出可提现上限（≤ ${max.toFixed(2)} U）`);
    }
    const bal = await tx.balance.findUnique({ where: { userId } });
    const newAvail = Number(bal?.available ?? 0);
    const w = await tx.withdrawOrder.create({
      data: { userId, amount, fee, feeReason: reason, toAddress, status: "pending" },
    });
    await tx.ledgerEntry.create({
      data: { userId, type: "withdraw", amount: -amount, balanceAfter: newAvail, refId: w.id, memo: `提现申请 ${amount}U` },
    });
    return w.id;
  });
}

export async function cancelWithdraw(userId: string, id: string) {
  const w = await prisma.withdrawOrder.findUnique({ where: { id } });
  if (!w || w.userId !== userId) throw new Error("订单不存在");
  if (w.status !== "pending") throw new Error("仅审核中可取消");
  await refundLocked(userId, id, Number(w.amount), "canceled", "提现取消退回");
}

export async function rejectWithdraw(id: string, reviewer: string) {
  const w = await prisma.withdrawOrder.findUnique({ where: { id } });
  if (!w) throw new Error("订单不存在");
  if (w.status !== "pending") throw new Error("仅审核中可驳回");
  await refundLocked(w.userId, id, Number(w.amount), "rejected", "提现驳回退回", reviewer);
}

async function refundLocked(
  userId: string,
  id: string,
  amount: number,
  status: "canceled" | "rejected",
  memo: string,
  reviewer?: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.balance.update({ where: { userId }, data: { available: { increment: amount }, locked: { decrement: amount } } });
    const bal = await tx.balance.findUnique({ where: { userId } });
    const newAvail = Number(bal?.available ?? amount);
    await tx.withdrawOrder.update({ where: { id }, data: { status, reviewedBy: reviewer, reviewedAt: reviewer ? new Date() : undefined } });
    await tx.ledgerEntry.create({ data: { userId, type: "withdraw_refund", amount, balanceAfter: newAvail, refId: id, memo } });
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

  const net = Number(w.amount) - Number(w.fee);
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
      data: { locked: { decrement: Number(w.amount) }, usedWithdraw: { increment: Number(w.amount) } },
    });
    await db.withdrawOrder.update({ where: { id }, data: { status: "paid", txHash, reviewedBy: reviewer, reviewedAt: new Date() } });
    await db.chainTx.create({ data: { txHash, type: "payout", userId: w.userId, amount: net, toAddress: w.toAddress, status: "confirmed" } });
    await db.operationLog.create({ data: { operator: reviewer, action: "通过提现", target: id, before: "审核中", after: "已到账" } });
  });
  return txHash;
}
