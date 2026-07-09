"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtU } from "@/lib/format";
import { tpl, type Dict } from "@/lib/i18n";

export default function WithdrawForm({
  max,
  feeFree,
  defaultAddress,
  t,
}: {
  max: number;
  feeFree: boolean;
  defaultAddress: string;
  t: Dict["withdraw"];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [addr, setAddr] = useState(defaultAddress);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddr() {
    if (!addr.trim()) return;
    try {
      await navigator.clipboard?.writeText(addr.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默降级 */
    }
  }

  const num = Math.max(0, Number(amount) || 0);
  const fee = feeFree ? 0 : num * 0.05;
  const arrive = Math.max(0, num - fee);
  const over = num > max;
  const addrValid = /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
  const [confirming, setConfirming] = useState(false);

  async function submit() {
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: num, toAddress: addr.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setAmount("");
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="paper mt-3 px-4 py-4">
      <div className="flex items-baseline justify-between">
        <label className="text-[0.82rem] font-semibold">{t.amountLabel}</label>
        <button onClick={() => setAmount(String(max))} className="text-[0.72rem] font-semibold" style={{ color: "#f1641e" }}>
          {tpl(t.all, { amount: fmtU(max) })}
        </button>
      </div>
      <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00"
        className="font-num mt-2 w-full rounded-xl px-3 py-3 text-2xl outline-none" style={{ background: "#fff", boxShadow: `inset 0 0 0 1.5px ${over ? "#c0152f" : "#dcdce1"}`, color: "#222222" }} />
      {over && <p className="mt-1.5 text-[0.7rem]" style={{ color: "#c0152f" }}>{t.over}</p>}

      <div className="mt-3 flex items-center justify-between">
        <label className="block text-[0.78rem] font-semibold">{t.toAddr}</label>
        <button type="button" onClick={copyAddr} disabled={!addr.trim()} className="text-[0.72rem] font-semibold" style={{ color: "#f1641e" }}>
          {copied ? `✅ ${t.copied}` : t.copyAddr}
        </button>
      </div>
      <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder={t.toAddrPh}
        className="mt-1 w-full break-all rounded-xl px-3 py-2.5 font-num text-[0.78rem] outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
      <p className="mt-1 text-[0.64rem]" style={{ color: "#8c8c8c" }}>{t.toAddrHint}</p>

      <div className="mt-3 space-y-1.5 rounded-xl px-3 py-3" style={{ background: "#f4f4f6" }}>
        <Row label={feeFree ? t.feeFree : t.fee5} value={`- ${fmtU(fee)} U`} tone={feeFree ? "#c14600" : "#c0152f"} />
        <Row label={t.arrive} value={`${fmtU(arrive)} U`} bold />
      </div>

      {err && <p className="mt-2 text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}

      <button onClick={() => { setErr(""); setConfirming(true); }} disabled={num <= 0 || over || !addrValid || loading} className="btn btn-primary mt-4 w-full">
        {t.submit}
      </button>

      {confirming && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" style={{ background: "rgba(20,16,30,0.55)" }} onClick={() => !loading && setConfirming(false)}>
          <div className="w-full max-w-[400px] rounded-t-2xl px-5 pb-6 pt-5 sm:rounded-2xl" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[1.05rem] font-bold">{t.confirmTitle}</div>
            <div className="mt-3 space-y-1.5 rounded-xl px-3 py-3" style={{ background: "#f4f4f6" }}>
              <Row label={t.amountLabel} value={`${fmtU(num)} U`} />
              <Row label={t.arrive} value={`${fmtU(arrive)} U`} bold />
            </div>
            <div className="mt-3 text-[0.72rem] font-semibold" style={{ color: "#595959" }}>{t.toAddr}</div>
            <div className="mt-1 break-all rounded-xl px-3 py-2.5 font-num text-[0.82rem]" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #f1641e", color: "#1c1c1c" }}>
              {addr.trim()}
            </div>
            <p className="mt-2.5 text-[0.7rem] leading-relaxed" style={{ color: "#c0152f" }}>⚠️ {t.confirmWarn}</p>
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setConfirming(false)} disabled={loading} className="btn btn-ghost flex-1">{t.confirmBack}</button>
              <button onClick={submit} disabled={loading} className="btn btn-primary flex-1">{loading ? t.submitting : t.confirmSubmit}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.76rem]" style={{ color: "#595959" }}>{label}</span>
      <span className="font-num text-[0.9rem]" style={{ color: tone ?? "#222222", fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}
