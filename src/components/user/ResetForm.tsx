"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { AuthShell, PillField, GoldButton, GoldLink, AUTH } from "@/components/user/auth-ui";

export default function ResetForm({ t }: { t: Dict["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function sendCode() {
    if (cooldown > 0 || sending) return;
    setErr("");
    setMsg("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr(t.emailPh); return; }
    setSending(true);
    try {
      const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      setMsg(t.codeSent);
      setCooldown(60);
      timer.current = setInterval(() => setCooldown((n) => { if (n <= 1 && timer.current) clearInterval(timer.current); return n - 1; }), 1000);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password !== confirm) { setErr(t.pwdMismatch); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password }) });
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
      title={t.resetTitle}
      subtitle={t.resetSub}
      footer={<>{t.backToLogin}<Link href="/login" style={{ color: AUTH.gold, fontWeight: 600 }}>{t.toLogin}</Link></>}
    >
      <form onSubmit={doReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PillField
          label={t.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPh}
          autoComplete="email"
          right={<GoldLink type="button" onClick={sendCode} disabled={cooldown > 0 || sending}>{sending ? t.sending : cooldown > 0 ? `${cooldown}s` : t.sendCode}</GoldLink>}
        />
        <PillField label={t.code} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePh} inputMode="numeric" />
        <PillField label={t.newPassword} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="new-password" secure />
        <PillField label={t.confirmPassword} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.confirmPh} autoComplete="new-password" secure />
        {msg && <p style={{ fontSize: "0.74rem", color: AUTH.gold }}>{msg}</p>}
        {err && <p style={{ fontSize: "0.74rem", color: AUTH.danger }}>{err}</p>}
        <GoldButton type="submit" disabled={loading}>{loading ? t.submitting : t.reset}</GoldButton>
      </form>
    </AuthShell>
  );
}
