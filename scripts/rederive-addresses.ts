// 用当前 .env 的 DEPOSIT_MNEMONIC 给所有用户（重新）派生专属充值地址。
// 换了助记词后必须跑：旧地址由旧助记词派生、平台已无法控制，须按 depositIndex 重算成新助记词的地址。
// 幂等：保留已有 depositIndex，缺失的按 max+1 顺序补；depositAddress 全部按 index 重派生。
// 运行：cd web && npm run rederive-addr
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { deriveDepositAddress } from "../src/lib/chain";

async function main() {
  if (!process.env.DEPOSIT_MNEMONIC) throw new Error("DEPOSIT_MNEMONIC 未配置");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, email: true, depositIndex: true } });

  let nextIndex = Math.max(-1, ...users.map((u) => u.depositIndex ?? -1)) + 1;
  let updated = 0;
  for (const u of users) {
    const index = u.depositIndex ?? nextIndex++;
    const address = deriveDepositAddress(index);
    await prisma.user.update({ where: { id: u.id }, data: { depositIndex: index, depositAddress: address } });
    updated++;
  }
  console.log(`✓ 已为 ${updated} 个用户按新助记词重派生专属地址（index 0..${nextIndex - 1}）`);
  const sample = await prisma.user.findUnique({ where: { email: "chowkwunhwa@gmail.com" }, select: { depositIndex: true, depositAddress: true } });
  if (sample) console.log(`  例：chowkwunhwa index=${sample.depositIndex} → ${sample.depositAddress}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error("✗", String(e instanceof Error ? e.message : e)); await prisma.$disconnect(); process.exit(1); });
