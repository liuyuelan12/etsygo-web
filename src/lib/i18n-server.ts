import "server-only";
import { cookies } from "next/headers";
import { DICTS, LOCALES, type Dict, type Locale } from "./i18n";

export { tpl } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("locale")?.value as Locale | undefined;
  return v && LOCALES.includes(v) ? v : "zh";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}
