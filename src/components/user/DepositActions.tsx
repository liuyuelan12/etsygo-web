"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tpl, type Dict } from "@/lib/i18n";

export default function DepositActions({ address, t }: { address: string; t: Dict["deposit"] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | null>(null);
  const [msg, setMsg] = useState("");

  async function sync() {
    setBusy("sync");
    setMsg("");
    try {
      const r = await fetch("/api/deposit/sync", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(d.credited > 0 ? tpl(t.credited, { amount: Number(d.credited).toLocaleString() }) : t.noNew);
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <button onClick={sync} disabled={busy !== null} className="btn btn-primary w-full">
        {busy === "sync" ? t.syncBusy : t.syncBtn}
      </button>
      <button onClick={() => navigator.clipboard?.writeText(address)} className="w-full text-center text-[0.72rem]" style={{ color: "#f1641e", fontWeight: 600 }}>
        {t.copyAddr}
      </button>
      {msg && <p className="text-center text-[0.78rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
