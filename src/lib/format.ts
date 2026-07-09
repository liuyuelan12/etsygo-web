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
