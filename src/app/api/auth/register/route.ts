import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { deriveDepositAddress } from "@/lib/chain";
import { attachReferral } from "@/lib/referral";
import { sendVerificationCode } from "@/lib/mail";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
});

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "邮箱或密码格式不正确（密码至少 6 位）" }, { status: 400 });
  }
  const { email, password, ref } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return Response.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const code = gen6();
  const verifyExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const passwordHash = await hashPassword(password);

  try {
    if (existing) {
      // 之前注册但没验证：更新密码与验证码
      await prisma.user.update({
        where: { email },
        data: { passwordHash, verifyCode: code, verifyExpiresAt },
      });
    } else {
      const index = await prisma.user.count();
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          verifyCode: code,
          verifyExpiresAt,
          depositIndex: index,
          depositAddress: deriveDepositAddress(index),
          balance: { create: {} },
        },
      });
      if (ref) await attachReferral(created.id, ref);
    }

    await sendVerificationCode({ to: email, code });
    return Response.json({ ok: true, email });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
