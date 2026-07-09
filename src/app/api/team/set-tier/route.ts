import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { z } from "zod";

// 上线给自己的直接下级设代理等级(1..10 → 5%..50%)，并将其标记为代理。
export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z
    .object({ downlineId: z.string(), tier: z.number().int().min(1).max(10) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: uid } });
  if (!me?.isAgent) return Response.json({ error: "你还不是代理，无法设置下级等级" }, { status: 403 });

  // 老板口径(2026-07-06)：下级代理等级不能高于上线自己（级差才成立）。
  if (parsed.data.tier > me.commissionTier) {
    return Response.json({ error: `下级等级不能高于你自己（最高 ${me.commissionTier * 5}%）` }, { status: 400 });
  }

  const down = await prisma.user.findUnique({ where: { id: parsed.data.downlineId } });
  if (!down || down.referrerId !== uid) {
    return Response.json({ error: "只能设置你的直接下级" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: down.id },
    data: { commissionTier: parsed.data.tier, isAgent: true },
  });
  await prisma.operationLog.create({
    data: { operator: `user:${uid}`, action: "设下级代理等级", target: down.id, before: String(down.commissionTier), after: String(parsed.data.tier) },
  });
  return Response.json({ ok: true });
}
