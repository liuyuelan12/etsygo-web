import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/mail";
import { z } from "zod";

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 找回密码第一步：给已注册邮箱发送 6 位重置验证码。
export async function POST(req: Request) {
  try {
    const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.emailVerifiedAt) return Response.json({ error: "该邮箱未注册" }, { status: 404 });

    const code = gen6();
    await prisma.user.update({ where: { email }, data: { verifyCode: code, verifyExpiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    await sendVerificationCode({ to: email, code, purpose: "reset" });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "发送失败，请稍后重试" }, { status: 502 });
  }
}
