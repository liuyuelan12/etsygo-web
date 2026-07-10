"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { AuthShell, PillField, GoldButton, AUTH } from "@/components/user/auth-ui";

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

  if (step === "verify") {
    return (
      <AuthShell
        title={t.registerTitle}
        subtitle={t.verifySub}
        footer={<>{t.haveAccount}<Link href="/login" style={{ color: AUTH.gold, fontWeight: 600 }}>{t.toLogin}</Link></>}
      >
        <form onSubmit={doVerify} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PillField label={t.code} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePh} inputMode="numeric" />
          {err && <p style={{ fontSize: "0.74rem", color: AUTH.danger }}>{err}</p>}
          <GoldButton type="submit" disabled={loading}>{loading ? t.verifying : t.verifyEnter}</GoldButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t.registerTitle}
      subtitle={t.registerSub}
      footer={<>{t.haveAccount}<Link href="/login" style={{ color: AUTH.gold, fontWeight: 600 }}>{t.toLogin}</Link></>}
    >
      <form onSubmit={doRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PillField label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" />
        <PillField label={t.username} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.usernamePh} autoComplete="username" />
        <PillField label={t.password} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="new-password" secure />
        {err && <p style={{ fontSize: "0.74rem", color: AUTH.danger }}>{err}</p>}
        <GoldButton type="submit" disabled={loading}>{loading ? t.submitting : t.register}</GoldButton>
      </form>
    </AuthShell>
  );
}
