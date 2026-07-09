import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  action: z.enum(["freeze", "unfreeze", "setAgent"]),
  tier: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  const { userId, action, tier } = parsed.data;

  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return Response.json({ error: "用户不存在" }, { status: 404 });
  const op = `admin:${admin.aid.slice(0, 8)}`;

  if (action === "freeze" || action === "unfreeze") {
    const frozen = action === "freeze";
    await prisma.user.update({ where: { id: userId }, data: { status: frozen ? "frozen" : "active" } });
    await prisma.freezeLog.create({ data: { userId, frozen, operator: op } });
    await prisma.operationLog.create({ data: { operator: op, action: frozen ? "冻结账号" : "解冻账号", target: userId, before: u.status, after: frozen ? "frozen" : "active" } });
  } else {
    // setAgent
    const t = tier ?? u.commissionTier;
    await prisma.user.update({ where: { id: userId }, data: { commissionTier: t, isAgent: true } });
    await prisma.operationLog.create({ data: { operator: op, action: "设代理等级", target: userId, before: `${u.commissionTier * 5}%`, after: `${t * 5}%` } });
  }
  return Response.json({ ok: true });
}
