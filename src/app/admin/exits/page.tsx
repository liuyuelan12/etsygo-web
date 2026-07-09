import Panel from "@/components/admin/Panel";
import { prisma } from "@/lib/db";
import { fmtU, fmtVN } from "@/lib/format";

export default async function AdminExitsPage() {
  const orders = await prisma.investmentOrder.findMany({
    where: { status: "exited" },
    orderBy: { startedAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">提前退出</div>
        <h1 className="font-serif text-[1.6rem] font-bold">提前退出（违约）记录</h1>
      </div>

      <div className="rounded-2xl px-5 py-3.5 text-[0.8rem]" style={{ background: "#fbe4e6", color: "#97122a", boxShadow: "inset 0 0 0 1px #f0c9ce" }}>
        规则：未满 180 天定存提前退出，扣本金 <b>30%</b> 违约金；已发放收益保留不追回；本金 70% 退回可提余额。
      </div>

      <Panel title="退出记录" desc={`共 ${orders.length} 笔`}>
        <table className="atable">
          <thead>
            <tr><th>订单</th><th>用户</th><th>模式</th><th className="right">本金(U)</th><th className="right">违约金30%</th><th className="right">实退(U)</th><th className="right">已发收益</th><th>起息</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={8} style={{ color: "#8c8c8c" }}>暂无提前退出记录</td></tr>
            ) : orders.map((o) => {
              const principal = Number(o.tierAmount);
              return (
                <tr key={o.id}>
                  <td className="num">{o.id.slice(0, 8)}</td>
                  <td>{o.user.email}</td>
                  <td>{o.mode === "solo" ? "独立店" : "拼店"}</td>
                  <td className="num right">{fmtU(principal)}</td>
                  <td className="num right" style={{ color: "#c0152f" }}>- {fmtU(principal * 0.3)}</td>
                  <td className="num right font-semibold" style={{ color: "#c14600" }}>{fmtU(principal * 0.7)}</td>
                  <td className="num right" style={{ color: "#595959" }}>{fmtU(Number(o.earned))}</td>
                  <td style={{ color: "#595959" }}>{fmtVN(o.startedAt.toISOString())}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
