import { adminLogin, setAdminCookie } from "@/lib/admin";
import { z } from "zod";

export async function POST(req: Request) {
  const parsed = z.object({ username: z.string(), password: z.string() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请输入账号密码" }, { status: 400 });
  const a = await adminLogin(parsed.data.username, parsed.data.password);
  if (!a) return Response.json({ error: "账号或密码不正确" }, { status: 401 });
  await setAdminCookie(a.id, a.role);
  return Response.json({ ok: true });
}
