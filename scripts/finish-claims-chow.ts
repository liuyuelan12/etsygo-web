// 续跑：把 chowkwunhwa 测试树里所有下级(test-*)的 active 订单幂等补领 1 天。
// 已领的自动跳过（claimInterestForOrder 内部 unique(orderId,date) 兜底），可反复运行。
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { claimInterestForOrder } from "../src/lib/interest";

async function main() {
  const orders = await prisma.investmentOrder.findMany({
    where: { status: "active", user: { email: { startsWith: "test-" } } },
    include: { user: { select: { email: true } } },
  });
  console.log(`待补领下级订单: ${orders.length}`);
  for (const o of orders) {
    const r = await claimInterestForOrder(o.userId, o.id);
    console.log(`  ${o.user.email} #${o.id.slice(0, 8)}: 领取 ${r.days} 天 +${r.credited.toFixed(2)} U`);
  }
  const rootComm = await prisma.ledgerEntry.aggregate({
    where: { user: { email: "chowkwunhwa@gmail.com" }, type: "commission" },
    _sum: { amount: true },
  });
  const recs = await prisma.commissionRecord.count({ where: { beneficiary: { email: "chowkwunhwa@gmail.com" } } });
  console.log(`✓ chowkwunhwa 累计佣金 ≈ ${Number(rootComm._sum.amount ?? 0).toFixed(3)} U（${recs} 条佣金记录）`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("✗", String(e instanceof Error ? e.message : e)); await prisma.$disconnect(); process.exit(1); });
