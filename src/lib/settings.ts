import { prisma } from "./db";

export type Tier = {
  amount: number;
  mode: "pin" | "solo";
  dailyRatePct: number;
  periodDays: number;
};

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getTiers(): Promise<Tier[]> {
  const s = await prisma.setting.findUnique({ where: { key: "invest.tiers" } });
  return s ? (JSON.parse(s.value) as Tier[]) : [];
}

export async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  const s = await prisma.setting.findUnique({ where: { key } });
  if (!s) return fallback;
  try {
    return JSON.parse(s.value) as T;
  } catch {
    return fallback;
  }
}
