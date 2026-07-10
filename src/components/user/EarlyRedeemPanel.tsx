"use client";

import { useState } from "react";
import ExitButton from "@/components/user/ExitButton";
import { fmtUInt } from "@/lib/format";

type Order = { id: string; mode: "pin" | "solo"; amount: number };
type Labels = {
  redeemTitle: string;
  redeemDesc: string;
  redeemNone: string;
  exitBtn: string;
  exitDone: string;
  solo: string;
  pin: string;
  penaltyLabel: string;
  refundLabel: string;
  redeemConfirm: string;
  redeemCancel: string;
  redeemWarn: string;
};

// 提款页顶部「本金提前赎回」入口：默认折叠防误触；展开后逐店赎回（复用 ExitButton → /api/exit）。
export default function EarlyRedeemPanel({ orders, t }: { orders: Order[]; t: Labels }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-3 overflow-hidden rounded-2xl" style={{ background: "#fbe4e6", boxShadow: "inset 0 0 0 1px #f0c9ce" }}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5" aria-expanded={open}>
        <span className="flex items-center gap-2">
          <span aria-hidden>⚠️</span>
          <span className="font-serif font-semibold" style={{ color: "#97122a" }}>{t.redeemTitle}</span>
        </span>
        <span className="text-[0.8rem]" style={{ color: "#97122a", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[0.74rem]" style={{ color: "#97122a" }}>{t.redeemDesc}</p>
          {orders.length === 0 ? (
            <p className="mt-2 text-[0.72rem]" style={{ color: "#97122a" }}>{t.redeemNone}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2">
                  <span className="text-[0.8rem]">
                    {o.mode === "solo" ? t.solo : t.pin} · {fmtUInt(o.amount)} U
                  </span>
                  <ExitButton
                    orderId={o.id}
                    amount={o.amount}
                    t={{ exitBtn: t.exitBtn, exitDone: t.exitDone, title: t.redeemTitle, warn: t.redeemWarn, penaltyLabel: t.penaltyLabel, refundLabel: t.refundLabel, redeemConfirm: t.redeemConfirm, redeemCancel: t.redeemCancel }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
