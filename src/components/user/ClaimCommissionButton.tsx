"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tpl } from "@/lib/i18n";

type Labels = { claim: string; claiming: string; claimed: string; none: string };

// 联盟页「领取动态佣金」按钮：POST /api/claim-commission → router.refresh()。
export default function ClaimCommissionButton({ amount, t }: { amount: string; t: Labels }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function claim() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/claim-commission", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(d.count > 0 ? tpl(t.claimed, { amount: Number(d.credited).toFixed(2), count: d.count }) : t.none);
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={claim} disabled={busy} className="btn btn-primary w-full">
        {busy ? t.claiming : tpl(t.claim, { amount })}
      </button>
      {msg && <p className="mt-2 text-center text-[0.72rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
