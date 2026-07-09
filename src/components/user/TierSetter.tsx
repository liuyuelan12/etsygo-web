"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 上线给直接下级设代理等级(5%~50%)。橙色大按钮 + 原生 select 透明叠加保证手机端可用；
// 选中只暂存，点「确定」才提交（防误触）。可选档位上限 = 上线本人等级(max)。
export default function TierSetter({
  downlineId,
  current,
  label,
  confirmLabel,
  max,
}: {
  downlineId: string;
  current: number;
  label: string;
  confirmLabel: string;
  max: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(current);

  async function submit() {
    if (selected === current) return;
    setBusy(true);
    try {
      const r = await fetch("/api/team/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downlineId, tier: selected }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "失败");
      router.refresh();
    } catch {
      setSelected(current); // 失败回滚到原值
    } finally {
      setBusy(false);
    }
  }

  const dirty = selected !== current;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="relative inline-flex">
        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-2"
          style={{ background: busy ? "#f7a878" : "#f1641e", color: "#fff", boxShadow: "0 8px 18px -8px rgba(241,100,30,0.85)" }}
        >
          <span className="text-[0.62rem] font-semibold opacity-90">{label}</span>
          <span className="font-num text-[1.05rem] font-bold leading-none">{selected * 5}%</span>
          <span className="text-[0.7rem] leading-none">▾</span>
        </div>
        <select
          disabled={busy}
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        >
          {Array.from({ length: Math.max(1, Math.min(10, max)) }, (_, i) => i + 1).map((tv) => (
            <option key={tv} value={tv}>
              {tv * 5}%
            </option>
          ))}
        </select>
      </div>
      {dirty && (
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-xl px-2.5 py-2 text-[0.72rem] font-bold"
          style={{ background: "#2e2740", color: "#fff" }}
        >
          {busy ? "…" : confirmLabel}
        </button>
      )}
    </div>
  );
}
