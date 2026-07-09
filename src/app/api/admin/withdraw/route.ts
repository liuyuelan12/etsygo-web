import { getAdmin } from "@/lib/admin";
import { approveWithdraw, rejectWithdraw } from "@/lib/withdraw";
import { z } from "zod";

// admin 审提现：通过 → 链上出款；驳回 → 解冻退回。
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "未登录" }, { status: 401 });
  const parsed = z.object({ id: z.string(), action: z.enum(["approve", "reject"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "参数错误" }, { status: 400 });
  try {
    if (parsed.data.action === "approve") {
      const txHash = await approveWithdraw(parsed.data.id, `admin:${admin.aid.slice(0, 8)}`);
      return Response.json({ ok: true, txHash });
    }
    await rejectWithdraw(parsed.data.id, `admin:${admin.aid.slice(0, 8)}`);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
