import { getSessionUserId } from "@/lib/auth";
import { cancelWithdraw } from "@/lib/withdraw";
import { z } from "zod";

export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z.object({ id: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  try {
    await cancelWithdraw(uid, parsed.data.id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
