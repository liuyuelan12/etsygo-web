// 一次性给 chowkwunhwa@gmail.com 造测试数据：
// - +5000U 余额；50% 代理；一笔 3000U 投资（回拨 25h，可立即在页面领取，不预领）
// - 10 人邀请树（2 直推 + 5 二层 + 3 三层），部分为代理并设等级、部分有投资
// - 预领取各下级订单一天 → 按 代理模式.md 的级差把动态利息发给上线（chowkwunhwa 能在联盟看到佣金）
// 运行：cd web && npm run setup-chow    （dotenv 读 web/.env 的 DATABASE_URL → Railway 生产库）
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { attachReferral } from "../src/lib/referral";
import { creditOrderDay } from "../src/lib/interest";

const ROOT_EMAIL = "chowkwunhwa@gmail.com";
const DAILY = 0.003;
const PERIOD = 180;
const H25 = 25 * 3600000;
const TEST_PW = "test1234";

// key, 用户名, 代理等级(1..10=5..50%，0=非代理), 投资额(0=不投), 上级key(root=chowkwunhwa)
const NODES = [
  { key: "l1a", username: "Anna工坊", tier: 7, invest: 3000, parent: "root" },
  { key: "l1b", username: "Leo小铺", tier: 4, invest: 1500, parent: "root" },
  { key: "l2a", username: "Mia", tier: 5, invest: 3000, parent: "l1a" },
  { key: "l2b", username: "Ben", tier: 0, invest: 3000, parent: "l1a" },
  { key: "l2c", username: "Cara", tier: 3, invest: 1500, parent: "l1a" },
  { key: "l2d", username: "Dan", tier: 0, invest: 3000, parent: "l1b" },
  { key: "l2e", username: "Eva", tier: 0, invest: 0, parent: "l1b" },
  { key: "l3a", username: "Finn", tier: 0, invest: 3000, parent: "l2a" },
  { key: "l3b", username: "Gina", tier: 0, invest: 1500, parent: "l2d" },
  { key: "l3c", username: "Hugo", tier: 0, invest: 1500, parent: "l2d" },
];

const emailOf = (key: string) => `test-${key}@etsygo-test.com`;

async function creditDeposit(userId: string, amount: number) {
  await prisma.balance.update({ where: { userId }, data: { available: { increment: amount } } });
  const bal = await prisma.balance.findUnique({ where: { userId } });
  await prisma.ledgerEntry.create({
    data: { userId, type: "deposit", amount, balanceAfter: Number(bal!.available), refId: `setup-${userId}`, memo: "测试充值(setup)" },
  });
}

// 直接建一笔回拨 25h 的投资订单并扣款（绕过 API），返回订单
async function invest(userId: string, amount: number) {
  const startedAt = new Date(Date.now() - H25);
  const maturesAt = new Date(startedAt.getTime() + PERIOD * 86400000);
  const changed = await prisma.balance.updateMany({
    where: { userId, available: { gte: amount } },
    data: { available: { decrement: amount }, totalInvested: { increment: amount } },
  });
  if (changed.count !== 1) throw new Error(`余额不足，无法为 ${userId} 投资 ${amount}`);
  const bal = await prisma.balance.findUnique({ where: { userId } });
  const order = await prisma.investmentOrder.create({
    data: { userId, tierAmount: amount, mode: amount >= 3000 ? "solo" : "pin", dailyRate: DAILY, periodDays: PERIOD, startedAt, maturesAt, etsygoShop: amount >= 3000 ? "TestShop" : null },
  });
  await prisma.ledgerEntry.create({
    data: { userId, type: "invest", amount: -amount, balanceAfter: Number(bal!.available), refId: order.id, memo: `开店 ${amount}U(setup)` },
  });
  return order;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 未配置");

  const root = await prisma.user.findUnique({ where: { email: ROOT_EMAIL }, include: { balance: true } });
  if (!root) throw new Error(`${ROOT_EMAIL} 不存在，请先注册`);

  // 幂等守卫：若测试树已存在则中止（避免重复加钱/建号）
  if (await prisma.user.findUnique({ where: { email: emailOf("l1a") } })) {
    throw new Error("检测到测试数据已存在（test-l1a@…），已中止。如需重来请先清理测试号。");
  }
  if (!root.balance) await prisma.balance.create({ data: { userId: root.id } });

  // 1) root: +5000、50% 代理、投 3000（回拨可领、不预领）
  await creditDeposit(root.id, 5000);
  await prisma.user.update({ where: { id: root.id }, data: { isAgent: true, commissionTier: 10 } });
  const rootOrder = await invest(root.id, 3000);
  console.log(`✓ ${ROOT_EMAIL}: +5000, 50%代理, 投3000 (订单 ${rootOrder.id.slice(0, 8)}, 可在页面领取)`);

  // 2) 建 10 人树
  const idByKey: Record<string, string> = { root: root.id };
  const pw = await bcrypt.hash(TEST_PW, 10);
  const orders: { userId: string; order: Awaited<ReturnType<typeof invest>> }[] = [];
  for (const n of NODES) {
    const email = emailOf(n.key);
    const u = await prisma.user.create({
      data: { email, username: n.username, passwordHash: pw, emailVerifiedAt: new Date(), balance: { create: {} } },
    });
    idByKey[n.key] = u.id;
    await attachReferral(u.id, idByKey[n.parent]);
    if (n.tier > 0) await prisma.user.update({ where: { id: u.id }, data: { isAgent: true, commissionTier: n.tier } });
    if (n.invest > 0) {
      await creditDeposit(u.id, n.invest);
      const order = await invest(u.id, n.invest);
      orders.push({ userId: u.id, order });
    }
    console.log(`  + ${n.key} (${n.username}) 上级=${n.parent} 等级=${n.tier ? n.tier * 5 + "%" : "非代理"} 投资=${n.invest}`);
  }

  // 3) 预领取各下级一天 → 级差动态利息发给上线（用新佣金逻辑）
  for (const { order } of orders) {
    await creditOrderDay(order, 0);
  }
  console.log(`✓ 已为 ${orders.length} 个下级订单各领取 1 天静态利息，动态利息按级差发放给上线`);

  // 汇总 root 佣金
  const commAgg = await prisma.ledgerEntry.aggregate({ where: { userId: root.id, type: "commission" }, _sum: { amount: true } });
  console.log(`✓ chowkwunhwa 累计佣金(动态利息) ≈ ${Number(commAgg._sum.amount ?? 0).toFixed(3)} U`);
  console.log(`  测试下级登录密码统一为: ${TEST_PW}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("✗", String(e instanceof Error ? e.message : e)); await prisma.$disconnect(); process.exit(1); });
