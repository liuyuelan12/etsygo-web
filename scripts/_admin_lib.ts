// EtsyGo 超级管理员 CLI — 共享 helper
// 复用 web/src/lib/db 的 prisma 单例（带 Neon/Railway 冷启动重试扩展）。
// 用相对路径 import ../src/lib，勿用 @/（tsx 不可靠解析 tsconfig paths）。
import { createInterface } from "node:readline";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";

export { prisma };

// ---------------- 常量 ----------------
export const OPERATOR_DEFAULT = "cli:super-admin";

export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const RED = "\x1b[31m";
export const CYAN = "\x1b[36m";
export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";
export const RESET = "\x1b[0m";

// 已知布尔 flag（不吞掉后续 token）；其余 --key 视为取值 flag。
const BOOL_FLAGS = new Set([
  "dry-run", "json", "yes", "agent", "frozen", "no-agent",
  "enable", "disable", "allow-negative", "help",
]);

export interface Parsed {
  pos: string[];
  flags: Record<string, string | true>;
}

// 通用分词：支持 --key=value / --key value / --bool / -h。未知取值 flag 后接非 flag 即取值。
export function tokenize(argv: string[]): Parsed {
  const pos: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h") {
      flags.help = true;
    } else if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        if (BOOL_FLAGS.has(key)) {
          flags[key] = true;
        } else {
          const next = argv[i + 1];
          if (next !== undefined && !next.startsWith("--")) {
            flags[key] = next;
            i++;
          } else {
            flags[key] = true;
          }
        }
      }
    } else {
      pos.push(a);
    }
  }
  return { pos, flags };
}

export function flagStr(flags: Record<string, string | true>, key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

export function operatorOf(flags: Record<string, string | true>): string {
  return flagStr(flags, "operator") ?? OPERATOR_DEFAULT;
}

// ---------------- 金额 ----------------
// 展示用：Number 足够（现有代码全程如此）。写钱务必用 Prisma.Decimal（见 adjust-balance）。
export function fmtU(x: unknown): string {
  const n = Number(x ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

// 解析金额（支持 +10 / -10 / 10），拒绝 NaN / 超 2^53 / Infinity。
export function parseAmount(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`金额无效: ${s}`);
  if (Math.abs(n) >= 2 ** 53) throw new Error(`金额过大(超 2^53): ${s}`);
  return n;
}

export { Prisma };

// ---------------- 用户 ----------------
export function label(u: { email: string; etsygoShop?: string | null }): string {
  return u.etsygoShop ? `${u.email} (${u.etsygoShop})` : u.email;
}

// 取用户 + balance + 上级 email，找不到抛错（大多数写命令需要）。
export async function findUserByEmail(email: string) {
  const u = await prisma.user.findUnique({
    where: { email },
    include: { balance: true, referrer: { select: { email: true } } },
  });
  if (!u) throw new Error(`用户不存在: ${email}`);
  return u;
}

// ---------------- 审计 ----------------
type OpLogClient = {
  operationLog: {
    create(args: {
      data: { operator: string; action: string; target: string; before?: string | null; after?: string | null };
    }): Promise<unknown>;
  };
};

export async function writeOpLog(
  db: OpLogClient,
  e: { operator: string; action: string; target: string; before?: string | null; after?: string | null },
): Promise<void> {
  await db.operationLog.create({
    data: {
      operator: e.operator,
      action: e.action,
      target: e.target,
      before: e.before ?? null,
      after: e.after ?? null,
    },
  });
}

// ---------------- 交互确认 ----------------
export function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${YELLOW}${question}${RESET} ${DIM}[y/N]${RESET} `, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

export const dryTag = (dry: boolean) => (dry ? `${DIM}[dry-run]${RESET} ` : "");
