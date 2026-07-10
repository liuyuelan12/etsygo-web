"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tpl } from "@/lib/i18n";

type Labels = { claimBtn: string; claiming: string; claimDone: string; claimNone: string };

// 订单详情页「领取每日收益」按钮：POST /api/claim → router.refresh()。
export default function ClaimButton({
  orderId,
  amount,
  days,
  t,
}: {
  orderId: string;
  amount: string;
  days: number;
  t: Labels;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function claim() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(d.days > 0 ? tpl(t.claimDone, { amount: Number(d.credited).toFixed(2), days: d.days }) : t.claimNone);
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
        {busy ? t.claiming : tpl(t.claimBtn, { days, amount })}
      </button>
      {msg && <p className="mt-2 text-center text-[0.74rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
