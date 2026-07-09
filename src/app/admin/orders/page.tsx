import Panel from "@/components/admin/Panel";
import { StatusSeal } from "@/components/Seal";
import { prisma } from "@/lib/db";
import { fmtU, fmtVN } from "@/lib/format";

const LABEL: Record<string, string> = { active: "营业中", matured: "已到期", exited: "已退出" };

export default async function AdminOrdersPage() {
  const orders = await prisma.investmentOrder.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } }, _count: { select: { interests: true } } },
  });
  const total = orders.reduce((s, o) => s + Number(o.tierAmount), 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">投资订单</div>
        <h1 className="font-serif text-[1.6rem] font-bold">开店订单台账</h1>
      </div>
      <Panel title="全部订单" desc={`共 ${orders.length} 笔 · 本金合计 ${fmtU(total)} U`}>
        <table className="atable">
          <thead>
            <tr><th>订单</th><th>用户</th><th>模式</th><th className="right">金额(U)</th><th className="right">已入账</th><th>计息</th><th>起息</th><th>到期</th><th>状态</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="num">{o.id.slice(0, 8)}</td>
                <td>{o.user.email}</td>
                <td>
                  <span className="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold" style={{ background: o.mode === "solo" ? "#efedf4" : "#fdeee6", color: o.mode === "solo" ? "#2e2740" : "#c14600" }}>
                    {o.mode === "solo" ? "独立店" : "拼店"}
                  </span>
                </td>
                <td className="num right font-semibold">{fmtU(Number(o.tierAmount))}</td>
                <td className="num right" style={{ color: "#c14600" }}>{fmtU(Number(o.earned))}</td>
                <td style={{ color: "#595959" }}>{o._count.interests}/{o.periodDays} 天</td>
                <td style={{ color: "#595959" }}>{fmtVN(o.startedAt.toISOString())}</td>
                <td style={{ color: "#595959" }}>{fmtVN(o.maturesAt.toISOString())}</td>
                <td><StatusSeal status={LABEL[o.status] ?? o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
