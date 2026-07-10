// 手动跑一轮入金扫链（测试自动入金用；poller 开启前先用它验证配置）。
// 运行：cd web && npm run scan-deposits
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { scanNewDeposits } from "../src/lib/deposit-poller";

async function main() {
  const r = await scanNewDeposits();
  console.log(`✓ 已扫到区块 ${r.scannedTo}，本轮入账 ${r.credited} 笔`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("✗", String(e instanceof Error ? e.message : e)); await prisma.$disconnect(); process.exit(1); });
