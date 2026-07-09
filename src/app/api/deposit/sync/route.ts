import { getSessionUserId } from "@/lib/auth";
import { syncDeposits } from "@/lib/ledger";

// 用户从自己钱包向充值地址打了 USDT 后，点"刷新到账"调用此接口入账。
export async function POST() {
  const uid = await getSessionUserId();
  if (!uid) return Response.json({ error: "未登录" }, { status: 401 });
  try {
    const { credited } = await syncDeposits(uid);
    return Response.json({ ok: true, credited });
  } catch (e) {
    return Response.json({ error: "同步失败：" + (e as Error).message }, { status: 502 });
  }
}
