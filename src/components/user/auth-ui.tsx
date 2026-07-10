"use client";

import { useState } from "react";

// 暗金奢华风 auth 视觉（黑底 + 香槟金 + 衬线字牌 + 药丸输入框），仅用于 auth 页，不影响 app 暖色主题。
export const AUTH = {
  bg: "#0e0c12",
  field: "#1a1822",
  line: "#2c2937",
  text: "#efece4",
  muted: "#948da3",
  gold: "#c8a561",
  goldHi: "#e3c98f",
  goldDeep: "#a8863f",
  danger: "#e08a86",
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 372 }}>
      <div className="flex flex-col items-center text-center">
        <div style={{ borderRadius: 17, boxShadow: `0 0 0 1px ${AUTH.gold}55, 0 18px 46px -14px ${AUTH.gold}66` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/etsygo-icon.svg" alt="EtsyGo" style={{ width: 62, height: 62, borderRadius: 17, display: "block" }} />
        </div>
        <h1 style={{ marginTop: 20, fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700, color: AUTH.text, letterSpacing: "0.04em" }}>
          {title}
        </h1>
        <div style={{ marginTop: 9, height: 1, width: 42, background: `linear-gradient(90deg, transparent, ${AUTH.gold}, transparent)` }} />
        <p style={{ marginTop: 11, fontSize: "0.76rem", color: AUTH.muted, letterSpacing: "0.06em" }}>{subtitle}</p>
      </div>
      <div className="mt-8" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
      {footer && (
        <div className="mt-6 text-center" style={{ fontSize: "0.74rem", color: AUTH.muted }}>
          {footer}
        </div>
      )}
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.2A9.5 9.5 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3 3.8M6.1 6.2A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 003.9-.8" />
    </svg>
  );
}

export function PillField({
  label,
  right,
  secure,
  ...rest
}: {
  label: string;
  right?: React.ReactNode;
  secure?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: AUTH.field, borderRadius: 14, boxShadow: `inset 0 0 0 1px ${AUTH.line}`, padding: "0 15px" }}>
      <span style={{ minWidth: 44, flexShrink: 0, color: AUTH.muted, fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.02em" }}>{label}</span>
      <span style={{ width: 1, height: 22, background: AUTH.line, flexShrink: 0 }} />
      <input
        {...rest}
        type={secure ? (show ? "text" : "password") : rest.type}
        style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: AUTH.text, fontSize: "0.9rem", padding: "14px 0" }}
      />
      {secure && (
        <button type="button" onClick={() => setShow((v) => !v)} style={{ background: "none", border: "none", color: AUTH.muted, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }} aria-label={show ? "hide" : "show"}>
          <EyeIcon open={show} />
        </button>
      )}
      {right}
    </div>
  );
}

export function GoldButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{
        width: "100%",
        padding: "15px",
        borderRadius: 999,
        border: "none",
        cursor: rest.disabled ? "not-allowed" : "pointer",
        background: `linear-gradient(180deg, ${AUTH.goldHi}, ${AUTH.gold})`,
        color: "#241d0c",
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: "0.08em",
        boxShadow: `0 16px 34px -14px ${AUTH.gold}99`,
        opacity: rest.disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// 内联金色文字按钮（发送验证码 / 忘记密码 等）
export function GoldLink({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{ background: "none", border: "none", padding: 0, cursor: rest.disabled ? "default" : "pointer", color: AUTH.gold, fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", opacity: rest.disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}
