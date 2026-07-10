"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tpl } from "@/lib/i18n";
import { fmtU } from "@/lib/format";

type Labels = {
  exitBtn: string;
  exitDone: string;
  title: string;
  warn: string;
  penaltyLabel: string;
  refundLabel: string;
  redeemConfirm: string;
  redeemCancel: string;
};

// 提前赎回：改为明确弹窗确认（防误触）。单击只打开弹窗；真正执行要点弹窗里的红色「确认赎回」。
export default function ExitButton({ orderId, amount, t }: { orderId: string; amount: number; t: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const penalty = amount * 0.3;
  const refund = amount * 0.7;

  async function confirmExit() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/exit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(tpl(t.exitDone, { refund: d.refund.toFixed(2), penalty: d.penalty.toFixed(2) }));
      setOpen(false);
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn btn-ghost px-3 py-1.5 text-[0.76rem]" style={{ color: "#c0152f" }}>
        {t.exitBtn}
      </button>
      {msg && <p className="mt-1 text-[0.66rem]" style={{ color: "#595959" }}>{msg}</p>}

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" style={{ background: "rgba(20,16,30,0.55)" }} onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-[400px] rounded-t-2xl px-5 pb-6 pt-5 sm:rounded-2xl" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="font-serif text-[1.05rem] font-bold" style={{ color: "#97122a" }}>⚠️ {t.title}</div>
            <p className="mt-2 text-[0.78rem] leading-relaxed" style={{ color: "#595959" }}>{t.warn}</p>
            <div className="mt-3 space-y-1.5 rounded-xl px-3 py-3" style={{ background: "#fbe4e6" }}>
              <Row label={t.penaltyLabel} value={`- ${fmtU(penalty)} U`} tone="#c0152f" />
              <Row label={t.refundLabel} value={`+ ${fmtU(refund)} U`} bold />
            </div>
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost flex-1">{t.redeemCancel}</button>
              <button onClick={confirmExit} disabled={busy} className="btn flex-1" style={{ background: "#c0152f", color: "#fff" }}>{busy ? "…" : t.redeemConfirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
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
