import { cookies } from "next/headers";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const locale = body?.locale as Locale;
  if (!locale || !LOCALES.includes(locale)) {
    return Response.json({ error: "invalid locale" }, { status: 400 });
  }
  const c = await cookies();
  c.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return Response.json({ ok: true });
}
