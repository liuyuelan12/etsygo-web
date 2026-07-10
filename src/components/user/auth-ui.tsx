"use client";

import { useState } from "react";

// 浅色 auth 视觉（白卡 + Etsy 橙 + label 在上），与 app 主题一致。
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
    <div className="tag w-full max-w-[400px] px-7 pb-7 pt-9">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-12 w-12" />
        <h1 className="font-serif mt-3 text-[1.4rem] font-bold">{title}</h1>
        <p className="text-[0.74rem]" style={{ color: "#757575" }}>{subtitle}</p>
      </div>
      <div className="mt-6 space-y-3">{children}</div>
      {footer && (
        <div className="mt-4 text-center text-[0.72rem]" style={{ color: "#757575" }}>
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

export function Field({
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
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[0.76rem] font-semibold" style={{ color: "#595959" }}>{label}</label>
        {right}
      </div>
      <div className="relative mt-1">
        <input
          {...rest}
          type={secure ? (show ? "text" : "password") : rest.type}
          className="w-full rounded-xl py-2.5 text-sm outline-none"
          style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1", paddingLeft: 12, paddingRight: secure ? 38 : 12 }}
        />
        {secure && (
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9a9a9a" }} aria-label={show ? "hide" : "show"}>
            <EyeIcon open={show} />
          </button>
        )}
      </div>
    </div>
  );
}

// 内联橙色文字按钮（发送验证码 / 忘记密码 等）
export function ActionLink({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{ background: "none", border: "none", padding: 0, cursor: rest.disabled ? "default" : "pointer", color: "#f1641e", fontWeight: 600, fontSize: "0.72rem", whiteSpace: "nowrap", opacity: rest.disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  );
}
