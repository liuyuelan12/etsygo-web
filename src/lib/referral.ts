import { prisma } from "./db";

// 新用户注册时挂到上级下，构建闭包表（支持无限层级）。
export async function attachReferral(newUserId: string, referrerId: string) {
  if (referrerId === newUserId) return;
  const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
  if (!referrer || referrer.status === "frozen") return; // 冻结上级不发展下级 / 无效则忽略

  await prisma.user.update({ where: { id: newUserId }, data: { referrerId } });

  // (上级, 新人, 1) + (上级的每个祖先, 新人, depth+1)
  const ancestors = await prisma.agentRelation.findMany({ where: { descendantId: referrerId } });
  const rows = [
    { ancestorId: referrerId, descendantId: newUserId, depth: 1 },
    ...ancestors.map((a) => ({ ancestorId: a.ancestorId, descendantId: newUserId, depth: a.depth + 1 })),
  ];
  await prisma.agentRelation.createMany({ data: rows, skipDuplicates: true });
}
