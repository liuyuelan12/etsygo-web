"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";

export default function LoginForm({ t }: { t: Dict["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tag w-full max-w-[400px] px-7 pb-7 pt-9">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-12 w-12" />
        <h1 className="font-serif mt-3 text-[1.4rem] font-bold">{t.loginTitle}</h1>
        <p className="text-[0.74rem]" style={{ color: "#757575" }}>{t.loginSub}</p>
      </div>

      <form onSubmit={doLogin} className="mt-6 space-y-3">
        <div>
          <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>{t.email}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
        </div>
        <div>
          <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>{t.password}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
        </div>
        {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.loggingIn : t.login}</button>
      </form>

      <div className="mt-4 text-center text-[0.72rem]" style={{ color: "#757575" }}>
        {t.noAccount}<Link href="/register" style={{ color: "#f1641e", fontWeight: 600 }}>{t.toRegister}</Link>
      </div>
    </div>
  );
}
