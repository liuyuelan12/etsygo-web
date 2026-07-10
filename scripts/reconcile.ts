// 每日对账 job：校验 balance.available === Σledger、balance.locked === Σpending提现。
// 运行：cd web && npm run reconcile   （建议挂 cron 每日跑；非零退出码可供告警）
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { reconcileAll } from "../src/lib/reconcile";

async function main() {
  const { checked, mismatches } = await reconcileAll();
  console.log(`对账完成：检查 ${checked} 个账户`);
  if (mismatches.length === 0) {
    console.log("✓ 全部一致（available === Σledger，locked === Σpending提现）");
    return;
  }
  console.error(`✗ 发现 ${mismatches.length} 个不一致账户：`);
  for (const m of mismatches) {
    console.error(`  ${m.email}: available=${m.available} Σledger=${m.ledgerSum} (差 ${m.availDiff}) | locked=${m.locked} Σpending=${m.pendingWithdraw} (差 ${m.lockDiff})`);
  }
  process.exitCode = 1; // 供 cron/告警据此判断
}

main().finally(() => prisma.$disconnect());
