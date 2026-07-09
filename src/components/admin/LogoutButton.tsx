"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function out() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin-login");
    router.refresh();
  }
  return (
    <button
      onClick={out}
      className="rounded-full px-3 py-1 text-[0.74rem] font-semibold"
      style={{ background: "#f5f5f7", color: "#595959", boxShadow: "inset 0 0 0 1px #e2e2e7" }}
    >
      退出
    </button>
  );
}
