import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailVerifiedAt) {
    return Response.json({ error: "账号不存在或未完成邮箱验证" }, { status: 401 });
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  await setSessionCookie(user.id); // 冻结用户仍可登录查看（只读由各操作处拦截）
  return Response.json({ ok: true, frozen: user.status === "frozen" });
}
