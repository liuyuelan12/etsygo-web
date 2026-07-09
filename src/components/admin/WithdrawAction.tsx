"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawAction({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function run(action: "approve" | "reject") {
    setBusy(action);
    setMsg("");
    try {
      const r = await fetch("/api/admin/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "失败");
      if (d.txHash) setMsg(`已出款 ${d.txHash.slice(0, 10)}…`);
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message.slice(0, 40));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <button disabled={busy !== null} onClick={() => run("approve")} className="btn btn-primary px-3 py-1 text-[0.74rem]">
          {busy === "approve" ? "出款中…" : "通过·出款"}
        </button>
        <button disabled={busy !== null} onClick={() => run("reject")} className="btn btn-ghost px-3 py-1 text-[0.74rem]">
          驳回
        </button>
      </div>
      {msg && <p className="mt-1 text-[0.66rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
