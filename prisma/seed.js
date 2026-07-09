// 默认数据：10 档佣金、可配置占位业务参数、root 管理员。
// 用 `npx prisma db seed` 运行（Prisma CLI 会自动加载 .env）。
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// 占位业务参数（后台「参数配置」页可改）
const SETTINGS = {
  "invest.tiers": JSON.stringify(
    // 老板口径(2026-07-10)：拼店 300/600/900/1500，独立店 3000/4000/5000/6000（共 8 档）
    [300, 600, 900, 1500, 3000, 4000, 5000, 6000].map((amount) => ({
      amount,
      mode: amount >= 3000 ? "solo" : "pin",
      dailyRatePct: 0.3, // 老板口径(07032)：客户日收益 0.3%（=9%/月）
      periodDays: 180, // 老板口径(2026-07-03)：定存 180 天；未满 180 天退出扣本金 30% 违约金
    }))
  ),
  "withdraw.window": JSON.stringify({ days: [1, 15], startHour: 10, endHour: 22, tzOffset: 7 }),
  "withdraw.enforceWindow": "true",
  "withdraw.fee": JSON.stringify({ feeFreeAfterDays: 30, pctUnder: 5 }),
  "withdraw.quotaMultiplier": "1.2", // 累计投资 ×120%
  "interest.payoutHour": "2", // 次日 02:00（UTC+7）
  "earlyExit.penaltyPct": "30",
  "agent.minInvestForAgent": "300",
};

const COMMISSION = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  pct: (i + 1) * 5, // 5,10,...,50
  enabled: i + 1 <= 8, // 默认开 1~8（≤40%）
  needSpecialPerm: i + 1 === 10, // 50% 档需特殊权限
}));

async function main() {
  // 佣金档
  for (const c of COMMISSION) {
    await prisma.commissionConfig.upsert({
      where: { level: c.level },
      update: { pct: c.pct, enabled: c.enabled, needSpecialPerm: c.needSpecialPerm },
      create: c,
    });
  }
  console.log("✓ 佣金档 10 档");

  // 参数
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log("✓ 占位参数", Object.keys(SETTINGS).length, "项");

  // root 管理员
  const username = "admin";
  const defaultPass = "etsygo-admin-2026";
  await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash: await bcrypt.hash(defaultPass, 10), role: "root" },
  });
  console.log(`✓ 管理员 ${username} / ${defaultPass}（请尽快改）`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
