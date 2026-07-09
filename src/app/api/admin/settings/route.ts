import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";
import { z } from "zod";

// admin 改可配置参数(invest.tiers / withdraw.* / interest.* 等)。value 存 JSON 字符串。
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z.object({ key: z.string(), value: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });

  // 校验：能 JSON.parse 或纯数字/字符串都放行；结构化键必须是合法 JSON
  const { key, value } = parsed.data;
  if (/^(invest\.|withdraw\.)/.test(key)) {
    try {
      JSON.parse(value);
    } catch {
      return Response.json({ error: "该项需是合法 JSON" }, { status: 400 });
    }
  }

  const before = (await prisma.setting.findUnique({ where: { key } }))?.value ?? "";
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  await prisma.operationLog.create({
    data: { operator: `admin:${admin.aid.slice(0, 8)}`, action: "改参数", target: key, before: before.slice(0, 80), after: value.slice(0, 80) },
  });
  return Response.json({ ok: true });
}
