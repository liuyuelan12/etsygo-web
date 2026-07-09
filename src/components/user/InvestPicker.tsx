"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtU, fmtUInt } from "@/lib/format";
import { tpl, type Dict } from "@/lib/i18n";
import type { Tier } from "@/lib/settings";
import InfoDot from "@/components/user/InfoDot";

export default function InvestPicker({ tiers, available, t: T, tips }: { tiers: Tier[]; available: number; t: Dict["invest"]; tips: { dailyIncome: string; matureIncome: string } }) {
  const router = useRouter();
  const [idx, setIdx] = useState(1);
  const [shopName, setShopName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const t = tiers[idx] ?? tiers[0];
  const daily = (t.amount * t.dailyRatePct) / 100;
  const total = daily * t.periodDays;
  const isIndep = t.mode === "solo";
  const needName = isIndep && shopName.trim().length === 0;
  const insufficient = available < t.amount;

  async function open() {
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: t.amount, etsygoShop: isIndep ? shopName.trim() : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mt-2 grid grid-cols-3 gap-2.5">
        {tiers.map((tier, i) => {
          const active = i === idx;
          return (
            <button
              key={tier.amount}
              onClick={() => setIdx(i)}
              className="relative rounded-2xl px-2 py-3 text-center transition-all"
              style={{
                background: active ? "#f1641e" : "#fff",
                color: active ? "#fff" : "#222222",
                boxShadow: active ? "0 10px 20px -10px rgba(241,100,30,0.8)" : "inset 0 0 0 1px #dcdce1",
              }}
            >
              {tier.mode === "solo" && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[0.58rem] font-bold" style={{ background: "#2e2740", color: "#fff" }}>
                  {T.solo}
                </span>
              )}
              <div className="font-num text-[1.15rem] font-semibold leading-none">{fmtUInt(tier.amount)}</div>
              <div className="text-[0.62rem] opacity-80">U</div>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 text-center text-[0.68rem]" style={{ color: "#8c8c8c" }}>
        {tpl(T.onlyTiers, { n: tiers.length, amount: fmtU(available) })}
      </p>

      <section className="tag mt-4 px-5 pb-5 pt-7">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{T.preview}</span>
          <span className="rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold" style={{ background: isIndep ? "#efedf4" : "#fdeee6", color: isIndep ? "#2e2740" : "#d94f12" }}>
            {isIndep ? T.solo : T.pin}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[0.72rem]" style={{ color: "#757575" }}>{T.amountLabel}</div>
            <div className="font-num text-[2.2rem] leading-none">{fmtUInt(t.amount)} <span className="text-base">U</span></div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[0.72rem]" style={{ color: "#757575" }}>{T.dailyEst}<InfoDot text={tips.dailyIncome} align="right" /></div>
            <div className="font-num text-[1.4rem] leading-none" style={{ color: "#c14600" }}>+{fmtU(daily)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl px-3 py-3" style={{ background: "#f4f4f6" }}>
          <Mini label={T.period} value={`${t.periodDays} ${T.days}`} />
          <Mini label={T.matureIncome} value={`${fmtU(total)} U`} mid tip={tips.matureIncome} />
          <Mini label={T.toMaturity} value={T.principalBack} />
        </div>

        {isIndep && (
          <div className="mt-4">
            <label className="text-[0.78rem] font-semibold" style={{ color: "#222222" }}>
              {T.etsyLabel} <span style={{ color: "#c0152f" }}>*</span>
            </label>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={T.etsyPh}
              className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
          </div>
        )}

        {err && <p className="mt-3 text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}

        <button onClick={open} disabled={needName || insufficient || loading} className="btn btn-primary mt-4 w-full">
          {loading ? T.opening : insufficient ? T.insufficient : needName ? T.needName : tpl(T.confirm, { amount: fmtUInt(t.amount) })}
        </button>
        <p className="mt-3 text-center text-[0.64rem]" style={{ color: "#8c8c8c" }}>{T.footnote}</p>
      </section>
    </div>
  );
}

function Mini({ label, value, mid, tip }: { label: string; value: string; mid?: boolean; tip?: string }) {
  return (
    <div className={`text-center ${mid ? "border-x" : ""}`} style={mid ? { borderColor: "#e6e6ea" } : undefined}>
      <div className="font-num text-[0.92rem] font-semibold">{value}</div>
      <div className="flex items-center justify-center gap-1 text-[0.64rem]" style={{ color: "#757575" }}>
        {label}
        {tip && <InfoDot text={tip} />}
      </div>
    </div>
  );
}
