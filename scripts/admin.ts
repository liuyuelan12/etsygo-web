// EtsyGo 超级管理员 CLI — 单入口 dispatcher
// 直连 web/.env 的 DATABASE_URL（Railway 生产库）。dotenv 必须在任何 ../src/lib 之前加载。
import "dotenv/config";
import { writeFileSync } from "node:fs";
import {
  prisma, Prisma, tokenize, flagStr, operatorOf, fmtU, parseAmount, label,
  findUserByEmail, writeOpLog, confirm, dryTag,
  GREEN, YELLOW, RED, CYAN, BOLD, DIM, RESET,
} from "./_admin_lib";
import { rejectWithdraw, approveWithdraw } from "../src/lib/withdraw";

type Flags = Record<string, string | true>;

const HELP_TEXT = `
${BOLD}EtsyGo 超级管理员 CLI${RESET}  —  npm run admin -- <命令> [参数] [--flags]
${DIM}直连 Railway 生产库。写操作先 --dry-run 预览；adjust-balance / approve-withdraw 需 --yes + 二次确认。${RESET}

${BOLD}查询 / 导出（只读）${RESET}
  list-users [--agent] [--frozen] [--limit N] [--json]
  user-detail <email> [--json]
  export [--format csv|json] [--out <path>] [--limit N]

${BOLD}代理 / 佣金${RESET}
  set-tier <email> <1-10> [--no-agent] [--dry-run]
  set-commission-config <level 1-10> [<pct>] [--enable|--disable] [--dry-run]
  team-tree <email> [--depth N] [--json]

${BOLD}资金调整${RESET}
  adjust-balance <email> <+/-amount> --memo "<原因>" [--yes] [--allow-negative] [--dry-run]

${BOLD}风控 / 审批${RESET}
  freeze <email> [--reason "<原因>"] [--dry-run]
  unfreeze <email> [--reason "<原因>"] [--dry-run]
  list-withdrawals [--status pending] [--email <x>] [--json]
  reject-withdraw <id> [--yes] [--dry-run]
  approve-withdraw <id> --yes        ${RED}← 真实链上出款·不可逆·勿重跑${RESET}

${DIM}全局: --operator <name> 覆盖审计操作人（默认 cli:super-admin）；--help 查看本帮助${RESET}
`.trim();

// ==================== A. 查询 / 导出 ====================

async function listUsers(flags: Flags) {
  const where: Record<string, unknown> = {};
  if (flags.agent === true) where.isAgent = true;
  if (flags.frozen === true) where.status = "frozen";
  const limit = flagStr(flags, "limit");
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: parseInt(limit, 10) } : {}),
    include: {
      balance: true,
      referrer: { select: { email: true } },
      _count: { select: { orders: true, descendants: true } },
    },
  });
  if (flags.json === true) {
    console.log(JSON.stringify(users, null, 2));
    return;
  }
  console.log(`${BOLD}共 ${users.length} 位用户${RESET}${limit ? ` ${DIM}(limit ${limit})${RESET}` : ""}`);
  for (const u of users) {
    const st = u.status === "frozen" ? `${RED}冻结${RESET}` : `${GREEN}正常${RESET}`;
    const agent = u.isAgent ? `${CYAN}L${u.commissionTier}(${u.commissionTier * 5}%)${RESET}` : `${DIM}非代理${RESET}`;
    console.log(`\n${BOLD}${label(u)}${RESET}  ${st}  ${agent}`);
    console.log(
      `  可用:${fmtU(u.balance?.available)}U  累计投资:${fmtU(u.balance?.totalInvested)}U  已提:${fmtU(u.balance?.usedWithdraw)}U` +
      `  订单:${u._count.orders}  下级:${u._count.descendants}  上级:${u.referrer?.email ?? "-"}`,
    );
    if (u.depositAddress) console.log(`  ${DIM}充值地址 ${u.depositAddress}${RESET}`);
  }
}

async function userDetail(pos: string[], flags: Flags) {
  const email = pos[0];
  if (!email) throw new Error("用法: user-detail <email>");
  const u = await prisma.user.findUnique({
    where: { email },
    include: {
      balance: true,
      referrer: { select: { email: true } },
      referrals: { select: { email: true, commissionTier: true, isAgent: true } },
      orders: { orderBy: { startedAt: "desc" }, include: { _count: { select: { interests: true } } } },
      withdrawals: { orderBy: { submittedAt: "desc" }, take: 20 },
      ledger: { orderBy: { createdAt: "desc" }, take: 20 },
      commissions: { orderBy: { createdAt: "desc" }, take: 20, include: { sourceUser: { select: { email: true } } } },
      _count: { select: { descendants: true } },
    },
  });
  if (!u) throw new Error(`用户不存在: ${email}`);
  if (flags.json === true) {
    console.log(JSON.stringify(u, null, 2));
    return;
  }
  const st = u.status === "frozen" ? `${RED}冻结${RESET}` : `${GREEN}正常${RESET}`;
  console.log(`${BOLD}${label(u)}${RESET}  ${st}  id=${u.id}`);
  console.log(`  代理: ${u.isAgent ? `${CYAN}L${u.commissionTier}(${u.commissionTier * 5}%)${RESET}` : "非代理"}  上级: ${u.referrer?.email ?? "-"}  直接下级: ${u.referrals.length}  全部下线: ${u._count.descendants}`);
  console.log(`  注册: ${u.registeredAt.toISOString()}  店铺: ${u.etsygoShop ?? "-"}  充值地址: ${u.depositAddress ?? "-"}`);
  if (u.balance) {
    console.log(`\n${BOLD}余额${RESET}  可用 ${fmtU(u.balance.available)}U | 累计投资 ${fmtU(u.balance.totalInvested)}U | 已用提现 ${fmtU(u.balance.usedWithdraw)}U | 锁定 ${fmtU(u.balance.locked)}U`);
  }
  console.log(`\n${BOLD}质押/订单（${u.orders.length}）${RESET}`);
  for (const o of u.orders) {
    console.log(`  ${o.status}  ${fmtU(o.tierAmount)}U  ${o.mode}  日率${(Number(o.dailyRate) * 100).toFixed(2)}%  ${o.periodDays}天  已计息${o._count.interests}天  累计收益${fmtU(o.earned)}U  ${DIM}起${o.startedAt.toISOString().slice(0, 10)}→熟${o.maturesAt.toISOString().slice(0, 10)}${RESET}`);
  }
  console.log(`\n${BOLD}收到的佣金（近 ${u.commissions.length}）${RESET}`);
  for (const c of u.commissions) {
    console.log(`  +${fmtU(c.amount)}U  L${c.level}(${Number(c.pct)}%)  来自 ${c.sourceUser.email}  ${DIM}${c.date}${RESET}`);
  }
  console.log(`\n${BOLD}提现（近 ${u.withdrawals.length}）${RESET}`);
  for (const w of u.withdrawals) {
    console.log(`  ${w.status}  ${fmtU(w.amount)}U (fee ${fmtU(w.fee)})  → ${w.toAddress}  ${DIM}${w.submittedAt.toISOString().slice(0, 10)}${RESET}`);
  }
  console.log(`\n${BOLD}账本（近 ${u.ledger.length}）${RESET}`);
  for (const l of u.ledger) {
    const amt = Number(l.amount);
    console.log(`  ${amt >= 0 ? GREEN + "+" : RED}${fmtU(l.amount)}${RESET}U  ${l.type}  余额后 ${fmtU(l.balanceAfter)}U  ${DIM}${l.memo ?? ""} · ${l.createdAt.toISOString().slice(0, 16)}${RESET}`);
  }
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeOut(out: string | undefined, text: string) {
  if (out) {
    writeFileSync(out, text);
    console.error(`${GREEN}✅ 已写入 ${out}（${text.length} 字节）${RESET}`);
  } else {
    process.stdout.write(text + "\n");
  }
}

async function exportUsers(flags: Flags) {
  const format = (flagStr(flags, "format") ?? "csv").toLowerCase();
  const out = flagStr(flags, "out");
  const limit = flagStr(flags, "limit");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: parseInt(limit, 10) } : {}),
    include: {
      balance: true,
      referrer: { select: { email: true } },
      orders: { include: { interests: { orderBy: { date: "asc" } } } },
      commissions: { include: { sourceUser: { select: { email: true } } } },
      _count: { select: { orders: true, descendants: true } },
    },
  });

  if (format === "json") {
    writeOut(out, JSON.stringify(users, null, 2));
    return;
  }

  // CSV：每用户一行，含质押汇总 + 订单明细 JSON 列（一对多用 JSON 单元格承载）。
  const header = [
    "邮箱", "店铺", "注册时间", "状态", "是否代理", "代理等级%",
    "累计投资U", "可用余额U", "已用提现U", "锁定U",
    "在投本金U", "累计收益U", "订单数", "在投订单数", "下级数", "上级", "充值地址", "订单明细JSON",
  ];
  const rows = users.map((u) => {
    const active = u.orders.filter((o) => o.status === "active");
    const investing = active.reduce((s, o) => s + Number(o.tierAmount), 0);
    const earned = u.orders.reduce((s, o) => s + Number(o.earned), 0);
    const ordersJson = JSON.stringify(u.orders.map((o) => ({
      amount: Number(o.tierAmount), mode: o.mode, status: o.status,
      dailyRate: Number(o.dailyRate), periodDays: o.periodDays,
      started: o.startedAt.toISOString().slice(0, 10), matures: o.maturesAt.toISOString().slice(0, 10),
      earned: Number(o.earned), interestDays: o.interests.length,
    })));
    return [
      u.email, u.etsygoShop ?? "", u.registeredAt.toISOString(),
      u.status === "frozen" ? "冻结" : "正常", u.isAgent ? "是" : "否", u.isAgent ? u.commissionTier * 5 : "",
      Number(u.balance?.totalInvested ?? 0), Number(u.balance?.available ?? 0),
      Number(u.balance?.usedWithdraw ?? 0), Number(u.balance?.locked ?? 0),
      investing, earned, u._count.orders, active.length, u._count.descendants,
      u.referrer?.email ?? "", u.depositAddress ?? "", ordersJson,
    ];
  });
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  writeOut(out, csv);
}

// ==================== B. 代理 / 佣金 ====================

async function setTier(pos: string[], flags: Flags) {
  const email = pos[0];
  const tier = parseInt(pos[1], 10);
  if (!email || !Number.isInteger(tier) || tier < 1 || tier > 10) throw new Error("用法: set-tier <email> <1-10>");
  const dry = flags["dry-run"] === true;
  const keepAgent = flags["no-agent"] === true;
  const u = await findUserByEmail(email);
  const before = `L${u.commissionTier}(${u.commissionTier * 5}%) isAgent=${u.isAgent}`;
  const after = `L${tier}(${tier * 5}%) isAgent=${keepAgent ? u.isAgent : true}`;
  console.log(`${dryTag(dry)}${label(u)}: ${before} ${DIM}→${RESET} ${after}`);
  if (dry) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: { commissionTier: tier, ...(keepAgent ? {} : { isAgent: true }) } });
    await writeOpLog(tx, { operator: operatorOf(flags), action: "设代理等级", target: u.id, before: `${u.commissionTier * 5}%`, after: `${tier * 5}%` });
  });
  console.log(`${GREEN}✅ 已更新${RESET}`);
}

async function setCommissionConfig(pos: string[], flags: Flags) {
  const level = parseInt(pos[0], 10);
  if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error("用法: set-commission-config <level 1-10> [pct] [--enable|--disable]");
  const pct = pos[1] != null ? Number(pos[1]) : undefined;
  if (pct !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) throw new Error("pct 需在 0-100");
  const enable = flags.enable === true ? true : flags.disable === true ? false : undefined;
  if (pct === undefined && enable === undefined) throw new Error("至少指定 <pct> 或 --enable / --disable");
  const dry = flags["dry-run"] === true;
  const cfg = await prisma.commissionConfig.findUnique({ where: { level } });
  if (!cfg) throw new Error(`档位不存在: L${level}`);
  if (cfg.needSpecialPerm) console.log(`${RED}${BOLD}⚠ L${level} 为特殊权限档（${Number(cfg.pct)}%），仅超级管理员可开启，请谨慎${RESET}`);
  const before = `${Number(cfg.pct)}% / ${cfg.enabled ? "开" : "关"}`;
  const after = `${pct ?? Number(cfg.pct)}% / ${(enable ?? cfg.enabled) ? "开" : "关"}`;
  console.log(`${dryTag(dry)}L${level}: ${before} ${DIM}→${RESET} ${after}`);
  if (dry) return;
  await prisma.$transaction(async (tx) => {
    await tx.commissionConfig.update({ where: { level }, data: { ...(pct != null ? { pct } : {}), ...(enable != null ? { enabled: enable } : {}) } });
    await writeOpLog(tx, { operator: operatorOf(flags), action: "改佣金档", target: `L${level}`, before, after });
  });
  console.log(`${GREEN}✅ 已更新${RESET}`);
}

async function teamTree(pos: string[], flags: Flags) {
  const email = pos[0];
  if (!email) throw new Error("用法: team-tree <email>");
  const depth = flagStr(flags, "depth");
  const u = await findUserByEmail(email);
  const rels = await prisma.agentRelation.findMany({
    where: { ancestorId: u.id, ...(depth ? { depth: { lte: parseInt(depth, 10) } } : {}) },
    orderBy: [{ depth: "asc" }],
    include: {
      descendant: {
        select: { email: true, etsygoShop: true, commissionTier: true, isAgent: true, status: true, balance: { select: { totalInvested: true, available: true } } },
      },
    },
  });
  if (flags.json === true) {
    console.log(JSON.stringify(rels, null, 2));
    return;
  }
  console.log(`${BOLD}${label(u)} 的下线（${rels.length} 人）${RESET}`);
  for (const r of rels) {
    const d = r.descendant;
    const inv = Number(d.balance?.totalInvested ?? 0);
    const qualified = inv >= 300 ? `${GREEN}✓代理资格${RESET}` : `${DIM}<300U${RESET}`;
    const agent = d.isAgent ? `${CYAN}L${d.commissionTier}(${d.commissionTier * 5}%)${RESET}` : `${DIM}非代理${RESET}`;
    const frozen = d.status === "frozen" ? ` ${RED}[冻结]${RESET}` : "";
    console.log(`${"  ".repeat(r.depth)}${DIM}d${r.depth}${RESET} ${d.email}${frozen}  ${agent}  投资${fmtU(inv)}U ${qualified}  可用${fmtU(d.balance?.available)}U`);
  }
}

// ==================== C. 资金调整 ====================

async function adjustBalance(pos: string[], flags: Flags) {
  const email = pos[0];
  if (!email || pos[1] === undefined) throw new Error('用法: adjust-balance <email> <+/-amount> --memo "原因"');
  const delta = parseAmount(pos[1]);
  if (delta === 0) throw new Error("调整额不能为 0");
  const deltaDec = new Prisma.Decimal(pos[1].replace(/^\+/, ""));
  const memo = flagStr(flags, "memo");
  if (!memo) throw new Error("--memo 必填（写入账本与审计）");
  const dry = flags["dry-run"] === true;
  const allowNeg = flags["allow-negative"] === true;
  const u = await findUserByEmail(email);
  if (!u.balance) throw new Error("该用户无 balance 记录");
  const cur = new Prisma.Decimal(u.balance.available.toString());
  const after = cur.add(deltaDec);
  if (after.lt(0) && !allowNeg) throw new Error(`调整后余额为负（${after.toString()}），如确需请加 --allow-negative`);
  const frozenNote = u.status === "frozen" ? ` ${YELLOW}[该账号已冻结]${RESET}` : "";
  console.log(`${dryTag(dry)}${label(u)}${frozenNote}`);
  console.log(`  可用余额 ${fmtU(cur)}U  ${delta >= 0 ? GREEN + "+" : RED}${pos[1]}${RESET}  ${DIM}→${RESET} ${BOLD}${fmtU(after)}U${RESET}`);
  console.log(`  ${DIM}备注: ${memo}${RESET}`);
  if (dry) return;
  if (flags.yes !== true) {
    const ok = await confirm(`确认给 ${u.email} 调整余额 ${delta >= 0 ? "+" : ""}${pos[1]}U ？`);
    if (!ok) { console.log(`${YELLOW}已取消${RESET}`); return; }
  }
  await prisma.$transaction(async (tx) => {
    const bal = await tx.balance.findUnique({ where: { userId: u.id } });
    if (!bal) throw new Error("balance 记录消失");
    const cur2 = new Prisma.Decimal(bal.available.toString());
    const after2 = cur2.add(deltaDec);
    if (after2.lt(0) && !allowNeg) throw new Error("并发保护：调整后余额为负");
    await tx.balance.update({ where: { userId: u.id }, data: { available: after2 } });
    await tx.ledgerEntry.create({ data: { userId: u.id, type: "adjust", amount: deltaDec, balanceAfter: after2, memo } });
    await writeOpLog(tx, { operator: operatorOf(flags), action: "人工调整余额", target: u.id, before: cur2.toString(), after: after2.toString() });
  });
  console.log(`${GREEN}✅ 已调整${RESET}`);
}

// ==================== D. 风控 / 审批 ====================

async function setFrozen(pos: string[], flags: Flags, frozen: boolean) {
  const email = pos[0];
  if (!email) throw new Error(`用法: ${frozen ? "freeze" : "unfreeze"} <email>`);
  const dry = flags["dry-run"] === true;
  const reason = flagStr(flags, "reason");
  const u = await findUserByEmail(email);
  const target = frozen ? "frozen" : "active";
  if (u.status === target) {
    console.log(`${YELLOW}${label(u)} 已是 ${target}，无需操作${RESET}`);
    return;
  }
  console.log(`${dryTag(dry)}${label(u)}: ${u.status} ${DIM}→${RESET} ${target}${reason ? ` ${DIM}(${reason})${RESET}` : ""}`);
  if (dry) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: { status: target } });
    await tx.freezeLog.create({ data: { userId: u.id, frozen, operator: operatorOf(flags), reason: reason ?? null } });
    await writeOpLog(tx, { operator: operatorOf(flags), action: frozen ? "冻结账号" : "解冻账号", target: u.id, before: u.status, after: target });
  });
  console.log(`${GREEN}✅ 已${frozen ? "冻结" : "解冻"}${RESET}`);
}

const WITHDRAW_STATUSES = ["pending", "approved", "paid", "rejected", "canceled"];

async function listWithdrawals(flags: Flags) {
  const status = flagStr(flags, "status");
  const email = flagStr(flags, "email");
  if (status && !WITHDRAW_STATUSES.includes(status)) {
    throw new Error(`--status 需为 ${WITHDRAW_STATUSES.join(" / ")}`);
  }
  const ws = await prisma.withdrawOrder.findMany({
    where: { ...(status ? { status } : {}), ...(email ? { user: { email } } : {}) } as Record<string, unknown>,
    orderBy: { submittedAt: "desc" },
    include: { user: { select: { email: true } } },
  });
  if (flags.json === true) {
    console.log(JSON.stringify(ws, null, 2));
    return;
  }
  console.log(`${BOLD}共 ${ws.length} 笔提现${RESET}`);
  for (const w of ws) {
    const net = Number(w.amount) - Number(w.fee);
    const c = w.status === "pending" ? YELLOW : w.status === "paid" ? GREEN : w.status === "rejected" || w.status === "canceled" ? DIM : CYAN;
    console.log(`${c}${w.status}${RESET}  ${w.id}  ${w.user.email}  ${fmtU(w.amount)}U ${DIM}(fee ${fmtU(w.fee)} → net ${fmtU(net)})${RESET}  → ${w.toAddress}  ${DIM}${w.submittedAt.toISOString().slice(0, 16)}${w.txHash ? " tx=" + w.txHash : ""}${RESET}`);
  }
}

async function rejectWithdrawCmd(pos: string[], flags: Flags) {
  const id = pos[0];
  if (!id) throw new Error("用法: reject-withdraw <id>");
  const dry = flags["dry-run"] === true;
  const w = await prisma.withdrawOrder.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!w) throw new Error("提现单不存在");
  if (w.status !== "pending") throw new Error(`仅审核中可驳回（当前 ${w.status}）`);
  console.log(`${dryTag(dry)}驳回 ${w.id}  ${w.user.email}  ${fmtU(w.amount)}U ${DIM}→ 退回可用余额${RESET}`);
  if (dry) return;
  if (flags.yes !== true) {
    const ok = await confirm(`确认驳回 ${w.user.email} 的提现 ${fmtU(w.amount)}U（退回余额）？`);
    if (!ok) { console.log(`${YELLOW}已取消${RESET}`); return; }
  }
  await rejectWithdraw(id, operatorOf(flags));
  console.log(`${GREEN}✅ 已驳回并退款${RESET}`);
}

async function approveWithdrawCmd(pos: string[], flags: Flags) {
  const id = pos[0];
  if (!id) throw new Error("用法: approve-withdraw <id> --yes");
  const dry = flags["dry-run"] === true;
  const w = await prisma.withdrawOrder.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!w) throw new Error("提现单不存在");
  if (w.status !== "pending") throw new Error(`仅审核中可通过（当前 ${w.status}）`);
  const net = Number(w.amount) - Number(w.fee);
  console.log(`${RED}${BOLD}⚠ 链上出款（真实 USDT 转账，不可逆）${RESET}`);
  console.log(`  单号 ${w.id}  用户 ${w.user.email}`);
  console.log(`  net = ${fmtU(net)}U  ${DIM}(amount ${fmtU(w.amount)} − fee ${fmtU(w.fee)})${RESET}`);
  console.log(`  → ${BOLD}${w.toAddress}${RESET}`);
  if (dry) {
    console.log(`${DIM}[dry-run] 不执行任何链上/数据库操作${RESET}`);
    return;
  }
  if (flags.yes !== true) throw new Error("危险操作：approve-withdraw 必须显式加 --yes");
  const ok = await confirm(`${RED}真的要链上打款 ${fmtU(net)}U 到 ${w.toAddress} 吗？不可逆，切勿重跑${RESET}`);
  if (!ok) { console.log(`${YELLOW}已取消${RESET}`); return; }
  console.log(`${DIM}链上转账中，请勿中断…${RESET}`);
  const txHash = await approveWithdraw(id, operatorOf(flags));
  console.log(`${GREEN}✅ 已出款  txHash=${txHash}${RESET}`);
}

// ==================== dispatcher ====================

async function main() {
  const argv = process.argv.slice(2);
  const sub = argv[0];
  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    console.log(HELP_TEXT);
    process.exit(sub ? 0 : 2);
  }
  const { pos, flags } = tokenize(argv.slice(1));

  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 未配置（应在 web/.env，指向 Railway 生产库）");
    switch (sub) {
      case "list-users": await listUsers(flags); break;
      case "user-detail": await userDetail(pos, flags); break;
      case "export": await exportUsers(flags); break;
      case "set-tier": await setTier(pos, flags); break;
      case "set-commission-config": await setCommissionConfig(pos, flags); break;
      case "team-tree": await teamTree(pos, flags); break;
      case "adjust-balance": await adjustBalance(pos, flags); break;
      case "freeze": await setFrozen(pos, flags, true); break;
      case "unfreeze": await setFrozen(pos, flags, false); break;
      case "list-withdrawals": await listWithdrawals(flags); break;
      case "reject-withdraw": await rejectWithdrawCmd(pos, flags); break;
      case "approve-withdraw": await approveWithdrawCmd(pos, flags); break;
      default:
        console.error(`${RED}未知命令: ${sub}${RESET}\n`);
        console.log(HELP_TEXT);
        process.exitCode = 2;
    }
  } catch (err) {
    console.error(`${RED}✗ ${err instanceof Error ? err.message : String(err)}${RESET}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
