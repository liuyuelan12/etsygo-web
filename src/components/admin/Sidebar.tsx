"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "仪表盘", icon: "🪵", exact: true },
  { href: "/admin/users", label: "用户管理", icon: "👤" },
  { href: "/admin/team", label: "邀请关系", icon: "🌿" },
  { href: "/admin/orders", label: "投资订单", icon: "🧾" },
  { href: "/admin/deposits", label: "充值记录", icon: "💰" },
  { href: "/admin/withdrawals", label: "提现审核", icon: "💸" },
  { href: "/admin/commission", label: "佣金配置", icon: "🪡" },
  { href: "/admin/exits", label: "提前退出", icon: "⚠️" },
  { href: "/admin/logs", label: "操作日志", icon: "📒" },
  { href: "/admin/settings", label: "参数配置", icon: "⚙️" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r px-3 py-5 md:flex"
      style={{ background: "#ffffff", borderColor: "#e2e2e7" }}
    >
      <div className="flex items-center gap-2 px-2 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-serif text-[0.98rem] font-bold">EtsyGo 账房</div>
          <div className="text-[0.62rem]" style={{ color: "#757575" }}>
            管理后台
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((n) => {
          const active = n.exact ? path === n.href : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className="nav-link" data-active={active}>
              <span className="nav-ico text-base opacity-80" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[0.82rem] font-semibold"
        style={{ background: "#f5f5f7", color: "#595959" }}
      >
        📱 查看用户端
      </Link>
    </aside>
  );
}
