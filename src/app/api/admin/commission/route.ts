import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { z } from "zod";

// admin 改某档佣金：比例 pct / 启用 enabled。50% 档(needSpecialPerm)仅 root 可开。
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z
    .object({ level: z.number().int().min(1).max(10), pct: z.number().min(0).max(100).optional(), enabled: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  const { level, pct, enabled } = parsed.data;

  const cfg = await prisma.commissionConfig.findUnique({ where: { level } });
  if (!cfg) return Response.json({ error: "档位不存在" }, { status: 404 });
  if (cfg.needSpecialPerm && enabled === true && admin.role !== "root") {
    return Response.json({ error: "50% 档位仅超级管理员可开启" }, { status: 403 });
  }

  await prisma.commissionConfig.update({
    where: { level },
    data: { ...(pct != null ? { pct } : {}), ...(enabled != null ? { enabled } : {}) },
  });
  await prisma.operationLog.create({
    data: { operator: `admin:${admin.aid.slice(0, 8)}`, action: "改佣金档", target: `L${level}`, before: `${Number(cfg.pct)}%/${cfg.enabled ? "开" : "关"}`, after: `${pct ?? Number(cfg.pct)}%/${enabled ?? cfg.enabled ? "开" : "关"}` },
  });
  return Response.json({ ok: true });
}
