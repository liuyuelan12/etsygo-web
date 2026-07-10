// 金额 / 时间 格式化工具。业务时区统一越南时间 UTC+7。

export function fmtU(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtUInt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return `${n}%`;
}

// 以越南时间(UTC+7)显示日期
export function fmtVN(iso: string, withTime = false): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  if (withTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
    opts.hour12 = false;
  }
  return new Intl.DateTimeFormat("zh-CN", opts).format(d).replace(/\//g, "-");
}

// 注册天数(自然日)
export function daysSince(iso: string, now = "2026-06-27T12:00:00+07:00"): number {
  const a = new Date(iso).getTime();
  const b = new Date(now).getTime();
  return Math.floor((b - a) / 86400000);
}

// 紧凑越南时间 YYYYMMDDHHmmss（UTC+7），用于派生订单号
export function fmtVNCompact(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}${g("month")}${g("day")}${g("hour")}${g("minute")}${g("second")}`;
}

// 提现订单号（前端 + admin 同源同结果）：EW + 紧凑越南时间 + id 后 4 位
export function withdrawOrderNo(w: { id: string; submittedAt: Date | string }): string {
  const iso = typeof w.submittedAt === "string" ? w.submittedAt : w.submittedAt.toISOString();
  return `EW${fmtVNCompact(iso)}${w.id.slice(-4).toUpperCase()}`;
}

// 充值订单号：ED + 紧凑越南时间 + txHash(refId)/记录 id 后 4 位（refId=txHash，跨 LedgerEntry/ChainTx 稳定）
export function depositOrderNo(e: { id: string; refId?: string | null; createdAt: Date | string }): string {
  const iso = typeof e.createdAt === "string" ? e.createdAt : e.createdAt.toISOString();
  const tail = (e.refId ?? e.id).slice(-4).toUpperCase();
  return `ED${fmtVNCompact(iso)}${tail}`;
}
