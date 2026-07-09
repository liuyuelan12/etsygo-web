"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_NAMES, type Locale } from "@/lib/i18n";

const ORDER: Locale[] = ["vi", "zh", "en"];
const SHORT: Record<Locale, string> = { vi: "VI", zh: "中", en: "EN" };

export default function LangSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(locale: Locale) {
    setOpen(false);
    if (locale === current) return;
    setBusy(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold"
        style={{ background: "#f5f5f7", color: "#595959", boxShadow: "inset 0 0 0 1px #dcdce1" }}
        aria-label="language"
      >
        🌐 {SHORT[current]}
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-1 overflow-hidden rounded-xl"
          style={{ background: "#fff", boxShadow: "0 8px 24px -8px rgba(0,0,0,0.25), inset 0 0 0 1px #e6e6ea", minWidth: 130 }}
        >
          {ORDER.map((l) => (
            <button
              key={l}
              onClick={() => pick(l)}
              className="block w-full px-3 py-2 text-left text-[0.82rem]"
              style={{ background: l === current ? "#fdeee6" : "#fff", color: l === current ? "#c14600" : "#222", fontWeight: l === current ? 700 : 500 }}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
