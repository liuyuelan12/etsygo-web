"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUserActions({
  userId,
  status,
  tier,
}: {
  userId: string;
  status: string;
  tier: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(body: object) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/user-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "失败");
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        disabled={busy}
        value={tier}
        onChange={(e) => call({ action: "setAgent", tier: Number(e.target.value) })}
        className="rounded-lg px-1.5 py-1 text-[0.72rem] font-semibold outline-none"
        style={{ background: "#fff", color: "#f1641e", boxShadow: "inset 0 0 0 1px #e2e2e7" }}
        aria-label="设代理等级"
        title="设为代理并设等级"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((t) => (
          <option key={t} value={t}>
            {t * 5}%
          </option>
        ))}
      </select>
      <button
        disabled={busy}
        onClick={() => call({ action: status === "frozen" ? "unfreeze" : "freeze" })}
        className="btn btn-ghost px-2.5 py-1 text-[0.72rem]"
        style={status === "frozen" ? undefined : { color: "#c0152f" }}
      >
        {status === "frozen" ? "解冻" : "冻结"}
      </button>
    </div>
  );
}
