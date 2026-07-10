import Panel from "@/components/admin/Panel";
import { StatusSeal } from "@/components/Seal";
import AdminUserActions from "@/components/admin/AdminUserActions";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN, daysSince } from "@/lib/format";

export default async function AdminUsersPage() {
  const [users, totalUsers, agents, frozen, pendingWithdraw, invAgg, availAgg] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { balance: true, referrer: { select: { email: true } }, _count: { select: { orders: true, descendants: true } } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isAgent: true } }),
    prisma.user.count({ where: { status: "frozen" } }),
    prisma.withdrawOrder.count({ where: { status: "pending" } }),
    prisma.balance.aggregate({ _sum: { totalInvested: true } }),
    prisma.balance.aggregate({ _sum: { available: true } }),
  ]);

  const stats = [
    { label: "总用户", value: fmtUInt(totalUsers) },
    { label: "代理数", value: fmtUInt(agents) },
    { label: "冻结", value: fmtUInt(frozen) },
    { label: "累计投资 (U)", value: fmtU(Number(invAgg._sum.totalInvested ?? 0)) },
    { label: "在账余额 (U)", value: fmtU(Number(availAgg._sum.available ?? 0)) },
    { label: "待审提现", value: fmtUInt(pendingWithdraw) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow">用户管理</div>
          <h1 className="font-serif text-[1.6rem] font-bold">店主名册</h1>
        </div>
        <a href="/api/admin/users/export" className="btn btn-dark py-1.5 text-[0.82rem]" download>
          ⬇ 导出 CSV
        </a>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="paper px-3.5 py-3">
            <div className="text-[0.7rem]" style={{ color: "#757575" }}>{s.label}</div>
            <div className="font-num mt-0.5 text-[1.25rem] font-semibold" style={{ color: "#222222" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Panel title="全部用户" desc={`共 ${totalUsers} 名 · 可导出 CSV`}>
        <table className="atable">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>注册</th>
              <th className="right">累计投资</th>
              <th className="right">可用余额</th>
              <th className="right">已用提现</th>
              <th>代理</th>
              <th>上级</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.username ?? <span style={{ color: "#bdbdbd" }}>—</span>}</td>
                <td style={{ color: "#595959" }}>{u.email}</td>
                <td style={{ color: "#595959" }}>
                  {fmtVN(u.registeredAt.toISOString())}
                  <span style={{ color: "#8c8c8c" }}> · {Math.max(0, daysSince(u.registeredAt.toISOString(), new Date().toISOString()))}天</span>
                </td>
                <td className="num right font-semibold">{fmtUInt(Number(u.balance?.totalInvested ?? 0))}</td>
                <td className="num right">{fmtU(Number(u.balance?.available ?? 0))}</td>
                <td className="num right">{fmtU(Number(u.balance?.usedWithdraw ?? 0))}</td>
                <td>{u.isAgent ? <span className="seal seal-orange">{u.commissionTier * 5}%</span> : <span style={{ color: "#bdbdbd" }}>非代理</span>}</td>
                <td style={{ color: u.referrer ? "#595959" : "#bdbdbd" }}>{u.referrer?.email ?? "—"}</td>
                <td><StatusSeal status={u.status === "frozen" ? "冻结" : "正常"} /></td>
                <td><AdminUserActions userId={u.id} status={u.status} tier={u.commissionTier} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
