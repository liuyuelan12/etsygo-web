"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// 概念解释小图标：点击弹出说明气泡。气泡用 portal 渲染到 body 顶层，
// 脱离卡片裁剪/层叠，永远不会被其他卡片挡住；按视口空间自动上/下弹并左右贴边。
export default function InfoDot({ text, tone = "light" }: { text: string; tone?: "dark" | "light"; align?: "center" | "right" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const WIDTH = 224; // w-56

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (open) return setOpen(false);
    const r = btnRef.current!.getBoundingClientRect();
    const vw = window.innerWidth;
    let left = r.left + r.width / 2 - WIDTH / 2;
    left = Math.max(10, Math.min(left, vw - WIDTH - 10));
    const up = window.innerHeight - r.bottom < 150; // 下方空间不足 → 向上弹
    const top = up ? r.top - 8 : r.bottom + 8;
    setPos({ top, left, up });
    setOpen(true);
  }

  const dot = tone === "dark" ? "rgba(255,255,255,0.6)" : "#a8a8b0";
  const ring = tone === "dark" ? "rgba(255,255,255,0.45)" : "#cfcfd6";

  return (
    <span className="inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="grid h-[15px] w-[15px] place-items-center rounded-full text-[0.58rem] font-bold italic leading-none"
        style={{ color: dot, boxShadow: `inset 0 0 0 1px ${ring}` }}
        aria-label="info"
      >
        i
      </button>
      {open && pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} aria-hidden />
            <div
              className="fixed z-[9999] w-56 rounded-xl px-3 py-2.5 text-left text-[0.72rem] font-normal not-italic leading-relaxed"
              style={{
                top: pos.top,
                left: pos.left,
                transform: pos.up ? "translateY(-100%)" : "none",
                background: "#1c1c1c",
                color: "#f4f4f6",
                boxShadow: "0 14px 34px -10px rgba(0,0,0,0.55)",
              }}
            >
              {text}
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
