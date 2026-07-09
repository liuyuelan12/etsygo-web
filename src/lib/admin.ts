import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "adm_session";
const secret = new TextEncoder().encode((process.env.SESSION_SECRET || "dev-secret") + "::admin");

export async function adminLogin(username: string, password: string) {
  const a = await prisma.adminUser.findUnique({ where: { username } });
  if (!a) return null;
  if (!(await bcrypt.compare(password, a.passwordHash))) return null;
  return a;
}

export async function setAdminCookie(adminId: string, role: string) {
  const token = await new SignJWT({ aid: adminId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const c = await cookies();
  c.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function getAdmin(): Promise<{ aid: string; role: string } | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret);
    return { aid: payload.aid as string, role: payload.role as string };
  } catch {
    return null;
  }
}
