import { getSessionUserId } from "@/lib/auth";
import { claimInterestForOrder } from "@/lib/interest";
import { z } from "zod";

// 用户按单领取每日收益：只发放已满整 24h 且未领的天数（投资 24h 后每天可领一次）。
export async function POST(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });

  const parsed = z.object({ orderId: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });

  try {
    const r = await claimInterestForOrder(uid, parsed.data.orderId);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
