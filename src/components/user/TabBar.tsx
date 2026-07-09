"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", key: "shop", icon: "shop" },
  { href: "/invest", key: "invest", icon: "plus" },
  { href: "/team", key: "team", icon: "team" },
  { href: "/withdraw", key: "withdraw", icon: "wallet" },
  { href: "/me", key: "user", icon: "user" },
] as const;

type NavLabels = { shop: string; invest: string; team: string; withdraw: string; me: string };
const KEY_TO_LABEL: Record<string, keyof NavLabels> = { shop: "shop", plus: "invest", team: "team", wallet: "withdraw", user: "me" };

function Icon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#f1641e" : "#757575";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "shop":
      return (
        <svg {...common}>
          <path d="M3 9l1.5-4.5h15L21 9" />
          <path d="M4 9v10h16V9" />
          <path d="M3 9a2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0" />
          <path d="M10 19v-5h4v5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5v7M8.5 12h7" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6.5a3 3 0 0 1 0 5.8" />
          <path d="M16.5 14.2A5.5 5.5 0 0 1 20.5 19" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
          <path d="M3.5 10h17" />
          <circle cx="16.5" cy="14" r="1.2" fill={stroke} stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
  }
}

export default function TabBar({ labels }: { labels: NavLabels }) {
  const path = usePathname();
  return (
    <nav className="tabbar">
      <div className="mx-auto flex max-w-[440px] items-stretch justify-around px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5"
              style={{ color: active ? "#f1641e" : "#757575" }}
            >
              <Icon name={t.icon} active={active} />
              <span className="text-[0.68rem]" style={{ fontWeight: active ? 700 : 500 }}>
                {labels[KEY_TO_LABEL[t.icon]]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
