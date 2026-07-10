import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

// 找回密码第二步：校验验证码 → 设置新密码 → 自动登录。
export async function POST(req: Request) {
  try {
    const parsed = z
      .object({ email: z.string().email(), code: z.string().length(6), password: z.string().min(6) })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "请填写邮箱、6 位验证码和至少 6 位新密码" }, { status: 400 });
    const { email, code, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.verifyCode || !user.verifyExpiresAt) return Response.json({ error: "请先获取验证码" }, { status: 404 });
    if (user.verifyExpiresAt < new Date()) return Response.json({ error: "验证码已过期，请重新获取" }, { status: 410 });
    if (user.verifyCode !== code) return Response.json({ error: "验证码不正确" }, { status: 400 });

    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { email }, data: { passwordHash, verifyCode: null, verifyExpiresAt: null } });
    await setSessionCookie(user.id); // 重置成功即自动登录
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "重置失败，请稍后重试" }, { status: 502 });
  }
}
