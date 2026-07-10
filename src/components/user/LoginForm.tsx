"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { AuthShell, Field } from "@/components/user/auth-ui";

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
      footer={<>{t.noAccount}<Link href="/register" style={{ color: "#f1641e", fontWeight: 600 }}>{t.toRegister}</Link></>}
    >
      <form onSubmit={doLogin} className="space-y-3">
        <Field label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPh} autoComplete="email" />
        <Field
          label={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.passwordPh}
          autoComplete="current-password"
          secure
          right={<Link href="/forgot" className="text-[0.72rem]" style={{ color: "#8c8c8c" }}>{t.forgotPassword}</Link>}
        />
        {err && <p className="text-[0.74rem]" style={{ color: "#c0152f" }}>{err}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? t.loggingIn : t.login}</button>
      </form>
    </AuthShell>
  );
}
