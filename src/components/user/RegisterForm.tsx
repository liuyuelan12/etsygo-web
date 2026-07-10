"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { AuthShell, Field } from "@/components/user/auth-ui";

export default function RegisterForm({ t }: { t: Dict["auth"] }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password !== confirm) { setErr(t.pwdMismatch); return; }
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

  const footer = <>{t.haveAccount}<Link href="/login" style={{ color: "#f1641e", fontWeight: 600 }}>{t.toLogin}</Link></>;

  if (step === "verify") {
    return (
      <AuthShell title={t.registerTitle} subtitle={t.verifySub} footer={footer}>
        <form onSubmit={doVerify} className="space-y-3">
          <Field label={t.code} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePh} inputMode="numeric" />
          {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.verifying : t.verifyEnter}</button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t.registerTitle} subtitle={t.registerSub} footer={footer}>
      <form onSubmit={doRegister} className="space-y-3">
        <Field label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" />
        <Field label={t.username} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.usernamePh} autoComplete="username" />
        <Field label={t.password} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="new-password" secure />
        <Field label={t.confirmPassword} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.confirmPh} autoComplete="new-password" secure />
        {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.submitting : t.register}</button>
      </form>
    </AuthShell>
  );
}
