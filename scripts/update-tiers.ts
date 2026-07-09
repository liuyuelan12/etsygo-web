// 一次性把生产库 Setting.invest.tiers 更新为老板 2026-07-10 定的 8 档：
// 拼店 300/600/900/1500 + 独立店 3000/4000/5000/6000。只改这一行 Setting，不动其它参数。
// 运行：cd web && npm run update-tiers   （dotenv 读 web/.env 的 DATABASE_URL → Railway 生产库）
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TIERS = [300, 600, 900, 1500, 3000, 4000, 5000, 6000].map((amount) => ({
  amount,
  mode: amount >= 3000 ? "solo" : "pin",
  dailyRatePct: 0.3, // 客户日收益 0.3%（=9%/月）
  periodDays: 180, // 定存 180 天；未满 180 天退出扣本金 30% 违约金
}));

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 未配置（应在 web/.env，指向 Railway 生产库）");
  const value = JSON.stringify(TIERS);
  await prisma.setting.upsert({
    where: { key: "invest.tiers" },
    update: { value },
    create: { key: "invest.tiers", value },
  });
  console.log("✓ invest.tiers 已更新为 8 档：", TIERS.map((t) => `${t.amount}(${t.mode})`).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
