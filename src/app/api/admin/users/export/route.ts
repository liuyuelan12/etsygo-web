import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/admin";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("未登录", { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { balance: true, referrer: { select: { email: true } }, _count: { select: { orders: true, descendants: true } } },
  });

  const header = ["用户名", "邮箱", "注册时间", "状态", "是否代理", "代理等级%", "累计投资U", "可用余额U", "已用提现U", "订单数", "下级数", "上级", "EtsyGo店铺", "充值地址"];
  const rows = users.map((u) => [
    u.username ?? "",
    u.email,
    u.registeredAt.toISOString(),
    u.status === "frozen" ? "冻结" : "正常",
    u.isAgent ? "是" : "否",
    u.isAgent ? u.commissionTier * 5 : "",
    Number(u.balance?.totalInvested ?? 0),
    Number(u.balance?.available ?? 0),
    Number(u.balance?.usedWithdraw ?? 0),
    u._count.orders,
    u._count.descendants,
    u.referrer?.email ?? "",
    u.etsygoShop ?? "",
    u.depositAddress ?? "",
  ]);

  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="etsygo-users.csv"`,
    },
  });
}
