"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 单条参数编辑：textarea + 保存
export default function SettingEditor({
  settingKey,
  label,
  hint,
  value,
}: {
  settingKey: string;
  label: string;
  hint?: string;
  value: string;
}) {
  const router = useRouter();
  const [val, setVal] = useState(value);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const dirty = val !== value;

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingKey, value: val }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "失败");
      setMsg("✅ 已保存，即时生效");
      router.refresh();
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const multiline = val.length > 40 || val.includes("{") || val.includes("[");

  return (
    <div className="paper px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[0.86rem] font-semibold">{label}</div>
          <div className="font-num text-[0.66rem]" style={{ color: "#8c8c8c" }}>{settingKey}</div>
        </div>
        <button onClick={save} disabled={!dirty || busy} className="btn btn-primary px-3 py-1 text-[0.76rem]">
          {busy ? "保存中…" : "保存"}
        </button>
      </div>
      {hint && <p className="mt-1 text-[0.68rem]" style={{ color: "#8c8c8c" }}>{hint}</p>}
      {multiline ? (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={4}
          className="font-num mt-2 w-full rounded-xl px-3 py-2 text-[0.78rem] outline-none"
          style={{ background: "#fff", boxShadow: "inset 0 0 0 1px #e2e2e7" }}
        />
      ) : (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="font-num mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "#fff", boxShadow: "inset 0 0 0 1px #e2e2e7" }}
        />
      )}
      {msg && <p className="mt-1.5 text-[0.72rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
