import Link from "next/link";
import Panel from "@/components/admin/Panel";
import { StatusSeal } from "@/components/Seal";
import WithdrawAction from "@/components/admin/WithdrawAction";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN } from "@/lib/format";

const ORDER_LABEL: Record<string, string> = { active: "营业中", matured: "已到期", exited: "已退出" };
const TONE = ["#f1641e", "#2f7d31", "#2e2740", "#c14600"];

export default async function AdminDashboard() {
  const [users, agents, invAgg, incAgg, pendingCount, pending, logs, orders] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isAgent: true } }),
    prisma.balance.aggregate({ _sum: { totalInvested: true } }),
    prisma.ledgerEntry.aggregate({ where: { type: { in: ["interest", "commission"] } }, _sum: { amount: true } }),
    prisma.withdrawOrder.count({ where: { status: "pending" } }),
    prisma.withdrawOrder.findMany({ where: { status: "pending" }, orderBy: { submittedAt: "desc" }, take: 6, include: { user: { select: { email: true } } } }),
    prisma.operationLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.investmentOrder.findMany({ orderBy: { startedAt: "desc" }, take: 6, include: { user: { select: { email: true } } } }),
  ]);

  const stats = [
    { label: "总用户", value: fmtUInt(users), sub: `代理 ${agents} 人` },
    { label: "在投本金 (U)", value: fmtU(Number(invAgg._sum.totalInvested ?? 0)), sub: "累计投资" },
    { label: "待审提现", value: fmtUInt(pendingCount), sub: "笔待处理" },
    { label: "累计发放收益 (U)", value: fmtU(Number(incAgg._sum.amount ?? 0)), sub: "收益+佣金" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow">仪表盘</div>
        <h1 className="font-serif text-[1.6rem] font-bold">今日账房一览</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="paper relative overflow-hidden px-4 py-4">
            <span className="absolute left-0 top-0 h-full w-1" style={{ background: TONE[i] }} />
            <div className="text-[0.74rem]" style={{ color: "#757575" }}>{s.label}</div>
            <div className="font-num mt-1 text-[1.7rem] font-semibold leading-none">{s.value}</div>
            <div className="mt-2 text-[0.66rem]" style={{ color: "#8c8c8c" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="待审提现" desc={`${pendingCount} 笔`} action={<Link href="/admin/withdrawals" className="btn btn-ghost py-1.5 text-[0.8rem]">全部 →</Link>}>
            <table className="atable">
              <thead><tr><th>单号</th><th>用户</th><th className="right">金额(U)</th><th>提交</th><th>操作</th></tr></thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr><td colSpan={5} style={{ color: "#8c8c8c" }}>暂无待审</td></tr>
                ) : pending.map((w) => (
                  <tr key={w.id}>
                    <td className="num">{w.id.slice(0, 8)}</td>
                    <td>{w.user.email}</td>
                    <td className="num right font-semibold">{fmtU(Number(w.amount))}</td>
                    <td style={{ color: "#595959" }}>{fmtVN(w.submittedAt.toISOString(), true)}</td>
                    <td><WithdrawAction id={w.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
        <Panel title="最近操作" desc="审计日志">
          <ul className="divide-y" style={{ borderColor: "#f0f0f2" }}>
            {logs.length === 0 ? <li className="px-5 py-3 text-[0.8rem]" style={{ color: "#8c8c8c" }}>暂无</li> : logs.map((l) => (
              <li key={l.id} className="px-5 py-3">
                <div className="text-[0.84rem] font-medium">{l.action}</div>
                <div className="text-[0.7rem]" style={{ color: "#8c8c8c" }}>{l.operator} · {fmtVN(l.createdAt.toISOString(), true)}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="近期投资订单" action={<Link href="/admin/orders" className="btn btn-ghost py-1.5 text-[0.8rem]">全部 →</Link>}>
        <table className="atable">
          <thead><tr><th>订单</th><th>用户</th><th>模式</th><th className="right">金额(U)</th><th>起息</th><th>状态</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="num">{o.id.slice(0, 8)}</td>
                <td>{o.user.email}</td>
                <td>{o.mode === "solo" ? "独立店" : "拼店"}</td>
                <td className="num right font-semibold">{fmtU(Number(o.tierAmount))}</td>
                <td style={{ color: "#595959" }}>{fmtVN(o.startedAt.toISOString())}</td>
                <td><StatusSeal status={ORDER_LABEL[o.status] ?? o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
