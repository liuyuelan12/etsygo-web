import { PrismaClient } from "@prisma/client";

// Neon 免费层空闲会挂起 compute，首个请求常报 PrismaClientInitializationError。
// 用查询扩展做透明重试，让冷启动的请求自动重连而非失败。
function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let i = 0; ; i++) {
          try {
            return await query(args);
          } catch (e) {
            const err = e as { name?: string; message?: string };
            const msg = String(err?.message ?? "");
            const retriable =
              err?.name === "PrismaClientInitializationError" ||
              /reach database|Closed|onnection|ECONNRESET|terminating|timeout|Timed out/i.test(msg);
            if (!retriable || i >= 4) throw e;
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrisma> };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
