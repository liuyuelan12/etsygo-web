// 手动跑一轮归集：把各用户专属地址里的 USDT 转进热钱包（供提现出款）。
// 自动归集(SWEEP_ENABLED)开启前，先用它验证：cd web && npm run sweep
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { sweepDeposits } from "../src/lib/sweep";

async function main() {
  const r = await sweepDeposits();
  console.log(`✓ 归集完成：${r.swept} 个地址 → 热钱包，合计 ${r.total} USDT（gas 补给 ${r.topups} 次）`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("✗", String(e instanceof Error ? e.message : e)); await prisma.$disconnect(); process.exit(1); });
