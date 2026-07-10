"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { AuthShell, PillField, GoldButton, AUTH } from "@/components/user/auth-ui";

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
    <AuthShell
      title={t.loginTitle}
      subtitle={t.loginSub}
      footer={<>{t.noAccount}<Link href="/register" style={{ color: AUTH.gold, fontWeight: 600 }}>{t.toRegister}</Link></>}
    >
      <form onSubmit={doLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PillField label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" />
        <PillField label={t.password} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="current-password" secure />
        <div style={{ textAlign: "right" }}>
          <Link href="/forgot" style={{ fontSize: "0.74rem", color: AUTH.muted }}>{t.forgotPassword}</Link>
        </div>
        {err && <p style={{ fontSize: "0.74rem", color: AUTH.danger }}>{err}</p>}
        <GoldButton type="submit" disabled={loading}>{loading ? t.loggingIn : t.login}</GoldButton>
      </form>
    </AuthShell>
  );
}
