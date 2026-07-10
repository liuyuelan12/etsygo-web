"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";

export default function RegisterForm({ t }: { t: Dict["auth"] }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const ref = new URLSearchParams(window.location.search).get("ref") || undefined;
      const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, username, password, ref }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setStep("verify");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function doVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
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
        <h1 className="font-serif mt-3 text-[1.4rem] font-bold">{t.registerTitle}</h1>
        <p className="text-[0.74rem]" style={{ color: "#757575" }}>{step === "form" ? t.registerSub : t.verifySub}</p>
      </div>

      {step === "form" ? (
        <form onSubmit={doRegister} className="mt-6 space-y-3">
          <Field label={t.email} type="email" value={email} onChange={setEmail} placeholder={t.emailPh} autoComplete="email" />
          <Field label={t.username} value={username} onChange={setUsername} placeholder={t.usernamePh} autoComplete="username" />
          <Field label={t.password} type="password" value={password} onChange={setPassword} placeholder={t.passwordPh} autoComplete="new-password" />
          {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.submitting : t.register}</button>
        </form>
      ) : (
        <form onSubmit={doVerify} className="mt-6 space-y-3">
          <Field label={t.code} value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePh} />
          {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.verifying : t.verifyEnter}</button>
        </form>
      )}

      <div className="mt-4 text-center text-[0.72rem]" style={{ color: "#757575" }}>
        {t.haveAccount}<Link href="/login" style={{ color: "#f1641e", fontWeight: 600 }}>{t.toLogin}</Link>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, autoComplete }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string }) {
  return (
    <div>
      <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} />
    </div>
  );
}
