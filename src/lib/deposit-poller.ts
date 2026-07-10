import { prisma } from "./db";
import { D } from "./money";
import { getProvider, getUsdt, fromUsdtUnits } from "./chain";
import { getSettingJson } from "./settings";

// 入金自动化：常驻扫链，把打到用户专属地址的 USDT 增量入账。
// 事件驱动近实时（默认约 20s 一轮）；txHash 幂等、金额 Decimal、达确认数才入账、游标断点续扫。
const CURSOR_KEY = "deposit.lastScannedBlock";

async function creditDeposit(
  userId: string,
  txHash: string,
  amount: import("@prisma/client").Prisma.Decimal,
  from: string | undefined,
  to: string,
  blockNumber: number,
  confirmations: number
): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        if (await tx.chainTx.findUnique({ where: { txHash } })) return; // 已入账
        await tx.balance.update({ where: { userId }, data: { available: { increment: amount } } });
        const newAvail = (await tx.balance.findUnique({ where: { userId } }))!.available;
        await tx.ledgerEntry.create({
          data: { userId, type: "deposit", amount, balanceAfter: newAvail, refId: txHash, memo: `链上充值 ${to}` },
        });
        await tx.chainTx.create({
          data: { txHash, type: "deposit", userId, amount, fromAddress: from, toAddress: to, confirmations, status: "confirmed", blockNumber },
        });
      },
      { timeout: 20000, maxWait: 10000 }
    );
  } catch (e) {
    const msg = String((e as Error)?.message ?? "");
    if (msg.includes("Unique constraint") || (e as { code?: string })?.code === "P2002") return; // 并发已入账
    throw e;
  }
}

// 扫描一轮：从游标+1 到 (当前区块 − 确认数)，把转入我方地址的 USDT 入账。
export async function scanNewDeposits(): Promise<{ scannedTo: number; credited: number }> {
  const users = await prisma.user.findMany({ where: { depositAddress: { not: null } }, select: { id: true, depositAddress: true } });
  if (users.length === 0) return { scannedTo: 0, credited: 0 };
  const userByAddr = new Map(users.map((u) => [u.depositAddress!.toLowerCase(), u.id]));
  const addresses = users.map((u) => u.depositAddress!);

  const provider = getProvider();
  const usdt = getUsdt(provider);
  const confirmations = Number(process.env.DEPOSIT_CONFIRMATIONS ?? "15");
  const blockStep = Number(process.env.DEPOSIT_SCAN_BLOCK_STEP ?? "2000");
  const scanFrom = Number(process.env.DEPOSIT_SCAN_FROM_BLOCK ?? "0");
  const addrChunk = 100; // 单次 topic 过滤的地址上限（防节点拒绝）

  const current = await provider.getBlockNumber();
  const safeTo = current - confirmations;
  const cursor = Number(await getSettingJson<number>(CURSOR_KEY, scanFrom));
  const from = Math.max(cursor + 1, scanFrom);
  if (safeTo < from) return { scannedTo: cursor, credited: 0 };

  let credited = 0;
  for (let start = from; start <= safeTo; start += blockStep) {
    const end = Math.min(start + blockStep - 1, safeTo);
    for (let i = 0; i < addresses.length; i += addrChunk) {
      const chunk = addresses.slice(i, i + addrChunk);
      const events = await usdt.queryFilter(usdt.filters.Transfer(null, chunk), start, end);
      for (const ev of events) {
        const log = ev as unknown as { transactionHash: string; blockNumber: number; args?: { from?: string; to?: string; value?: bigint } };
        const to = (log.args?.to ?? "").toLowerCase();
        const userId = userByAddr.get(to);
        if (!userId) continue;
        const amount = D(fromUsdtUnits(log.args?.value ?? BigInt(0)));
        if (amount.lte(0)) continue;
        await creditDeposit(userId, log.transactionHash, amount, log.args?.from, log.args?.to ?? to, log.blockNumber, confirmations);
        credited++;
      }
    }
    await prisma.setting.upsert({ where: { key: CURSOR_KEY }, update: { value: String(end) }, create: { key: CURSOR_KEY, value: String(end) } });
  }
  return { scannedTo: safeTo, credited };
}

let started = false;
export function startDepositPoller(): void {
  if (started) return;
  started = true;
  const interval = Number(process.env.DEPOSIT_POLL_MS ?? "20000");
  const loop = async () => {
    try {
      await scanNewDeposits();
    } catch (e) {
      console.error("[deposit-poller]", (e as Error).message);
    } finally {
      setTimeout(loop, interval);
    }
  };
  console.log(`[deposit-poller] 已启动，每 ${interval}ms 扫一轮`);
  setTimeout(loop, 8000); // 启动后延迟 8s 开跑
}
