"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 审核中订单的用户操作：用户只能取消；通过/驳回必须走 admin 审核。
export default function WithdrawActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function run(label: string, path: string, body: object) {
    setBusy(label);
    setMsg("");
    try {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "失败");
      if (d.txHash) setMsg(`✅ 已出款 tx ${d.txHash.slice(0, 10)}…`);
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2.5">
      <div className="flex gap-2">
        <button
          onClick={() => run("cancel", "/api/withdraw/cancel", { id })}
          disabled={busy !== null}
          className="btn btn-ghost w-full py-2 text-[0.78rem]"
        >
          取消
        </button>
      </div>
      {msg && <p className="mt-1.5 text-[0.72rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
