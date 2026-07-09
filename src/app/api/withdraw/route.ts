import { getSessionUserId } from "@/lib/auth";
import { applyWithdraw } from "@/lib/withdraw";
import { z } from "zod";

const schema = z.object({
  amount: z.number(),
  toAddress: z.string(),
});

export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  try {
    const id = await applyWithdraw(uid, parsed.data.amount, parsed.data.toAddress);
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
