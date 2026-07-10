import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { attachReferral } from "@/lib/referral";
import { sendVerificationCode } from "@/lib/mail";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(2).max(30),
  password: z.string().min(6),
  ref: z.string().optional(),
});

function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "请填写有效的邮箱、用户名（2-30 字）和密码（至少 6 位）" }, { status: 400 });
    }
    const { email, username, password, ref } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt) {
      return Response.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }

    // 用户名唯一：占用者若不是本人（同邮箱的未验证旧号）则拒绝
    const nameOwner = await prisma.user.findUnique({ where: { username } });
    if (nameOwner && nameOwner.email !== email) {
      return Response.json({ error: "该用户名已被占用，请换一个" }, { status: 409 });
    }

    const code = gen6();
    const verifyExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const passwordHash = await hashPassword(password);

    if (existing) {
      // 之前注册但没验证：更新用户名/密码/验证码
      await prisma.user.update({
        where: { email },
        data: { username, passwordHash, verifyCode: code, verifyExpiresAt },
      });
    } else {
      const created = await prisma.user.create({
        // 充值走平台统一收款地址(RECEIVE_ADDRESS)，不再派生每人专属地址
        data: { email, username, passwordHash, verifyCode: code, verifyExpiresAt, balance: { create: {} } },
      });
      if (ref) await attachReferral(created.id, ref);
    }

    await sendVerificationCode({ to: email, code });
    return Response.json({ ok: true, email });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(",") ?? "";
      return Response.json(
        { error: target.includes("username") ? "该用户名已被占用，请换一个" : "该邮箱已注册，请直接登录" },
        { status: 409 }
      );
    }
    return Response.json({ error: (e as Error).message || "注册失败，请稍后重试" }, { status: 502 });
  }
}
