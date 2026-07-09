import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "请输入 6 位验证码" }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.verifyCode || !user.verifyExpiresAt) {
    return Response.json({ error: "请先注册" }, { status: 404 });
  }
  if (user.verifyExpiresAt < new Date()) {
    return Response.json({ error: "验证码已过期，请重新获取" }, { status: 410 });
  }
  if (user.verifyCode !== code) {
    return Response.json({ error: "验证码不正确" }, { status: 400 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { email },
    // 注册日 = 邮箱验证完成之日（影响计息/手续费基准）
    data: { emailVerifiedAt: now, registeredAt: now, verifyCode: null, verifyExpiresAt: null },
  });

  await setSessionCookie(user.id); // 验证即自动登录
  return Response.json({ ok: true });
}
