"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "登录失败");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tag w-full max-w-[380px] px-7 pb-7 pt-9">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-12 w-12" />
        <h1 className="font-serif mt-3 text-[1.3rem] font-bold">EtsyGo 账房</h1>
        <p className="text-[0.74rem]" style={{ color: "#757575" }}>管理后台登录</p>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>账号</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
        </div>
        {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
        <button type="submit" disabled={loading} className="btn btn-dark w-full">{loading ? "登录中…" : "登录"}</button>
      </form>
    </div>
  );
}
