import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/admin/LogoutButton";
import { getAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin-login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 md:px-8"
          style={{ background: "rgba(245,245,247,0.85)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e2e2e7" }}
        >
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-6 w-6 md:hidden" />
            <span className="text-[0.78rem]" style={{ color: "#757575" }}>EtsyGo 小铺 · 运营账房</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.78rem] sm:inline" style={{ color: "#757575" }}>越南时间 UTC+7</span>
            <span className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ background: "#ffffff", boxShadow: "inset 0 0 0 1px #e2e2e7" }}>
              <span className="grid h-6 w-6 place-items-center rounded-full text-[0.7rem]" style={{ background: "#2e2740", color: "#fff" }}>管</span>
              <span className="text-[0.78rem] font-semibold">{admin.role === "root" ? "超级管理员" : "管理员"}</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <div className="px-5 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
