"use client";

import { useRouter } from "next/navigation";

export default function LogoutLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const router = useRouter();
  async function out() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={out} className={className} style={style}>
      退出
    </button>
  );
}
