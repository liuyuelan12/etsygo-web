"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { level: number; pct: number; enabled: boolean; needSpecialPerm: boolean };

export default function CommissionConfig({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  async function save(level: number, body: { pct?: number; enabled?: boolean }) {
    setBusy(level);
    setToast("");
    try {
      const r = await fetch("/api/admin/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, ...body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "失败");
      router.refresh();
    } catch (e) {
      setToast("⚠️ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="paper overflow-hidden">
      <table className="atable">
        <thead>
          <tr><th>档位</th><th className="right">佣金比例</th><th>手机端</th><th>权限</th><th>启用</th></tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.level}>
              <td>
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[0.74rem] font-bold" style={{ background: "#eeeef1", color: "#595959", display: "inline-grid" }}>{t.level}</span>
              </td>
              <td className="right">
                <input
                  type="number" min={0} max={100} defaultValue={t.pct}
                  disabled={busy === t.level}
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== t.pct) save(t.level, { pct: v }); }}
                  className="font-num w-16 rounded-lg px-2 py-1 text-right text-[0.95rem] font-semibold outline-none"
                  style={{ background: "#fff", color: t.enabled ? "#f1641e" : "#8c8c8c", boxShadow: "inset 0 0 0 1px #e2e2e7" }}
                />
                <span className="ml-1 text-[0.8rem]" style={{ color: "#8c8c8c" }}>%</span>
              </td>
              <td>{t.pct <= 40 ? <span className="text-[0.78rem]" style={{ color: "#c14600" }}>可见</span> : <span className="text-[0.78rem]" style={{ color: "#8c8c8c" }}>隐藏(&gt;40%)</span>}</td>
              <td>{t.needSpecialPerm ? <span className="seal seal-plum">特殊权限</span> : <span style={{ color: "#bdbdbd" }}>—</span>}</td>
              <td>
                <button className="switch" data-on={t.enabled} style={{ background: t.enabled ? "#f1641e" : "#dcdce1" }} disabled={busy === t.level} onClick={() => save(t.level, { enabled: !t.enabled })} aria-label={`切换第 ${t.level} 档`}>
                  <i />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {toast && <p className="px-4 py-2 text-[0.72rem]" style={{ color: "#c0152f" }}>{toast}</p>}
    </div>
  );
}
