import { getSessionUserId } from "@/lib/auth";
import { claimCommission } from "@/lib/commission";

// 用户领取全部未领动态佣金 → 入账可用余额。
export async function POST() {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  try {
    const r = await claimCommission(uid);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
