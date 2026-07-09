"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tpl } from "@/lib/i18n";

type ExitLabels = { exitBtn: string; exitConfirm: string; exitDone: string };

export default function ExitButton({ orderId, penalty, t }: { orderId: string; penalty: number; t: ExitLabels }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/exit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(tpl(t.exitDone, { refund: d.refund.toFixed(2), penalty: d.penalty.toFixed(2) }));
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="btn btn-ghost px-3 py-1.5 text-[0.76rem]" style={confirm ? { boxShadow: "inset 0 0 0 1.5px #c0152f", color: "#c0152f" } : undefined}>
        {busy ? "…" : confirm ? tpl(t.exitConfirm, { amount: penalty.toFixed(0) }) : t.exitBtn}
      </button>
      {msg && <p className="mt-1 text-[0.66rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
