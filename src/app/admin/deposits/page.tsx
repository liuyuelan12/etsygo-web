import Panel from "@/components/admin/Panel";
import { prisma } from "@/lib/db";
import { fmtU, fmtVN, depositOrderNo } from "@/lib/format";

export default async function AdminDepositsPage() {
  const rows = await prisma.ledgerEntry.findMany({
    where: { type: "deposit" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">充值记录</div>
        <h1 className="font-serif text-[1.6rem] font-bold">USDT 到账台账</h1>
      </div>

      <div className="paper flex items-center gap-3 px-5 py-3.5">
        <span className="seal seal-plum">近 {rows.length} 笔</span>
        <span className="text-[0.78rem]" style={{ color: "#595959" }}>
          链上 USDT 转入用户专属充值地址、达确认数后自动入账。订单号与用户端一致，可凭号核对。
        </span>
      </div>

      <Panel title="到账明细" desc={`合计 ${fmtU(total)} U`}>
        <table className="atable">
          <thead>
            <tr>
              <th>订单号</th><th>用户</th><th className="right">金额(U)</th><th>链上 tx</th><th>到账时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ color: "#8c8c8c" }}>暂无充值</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{depositOrderNo(r)}</td>
                <td>{r.user.email}</td>
                <td className="num right font-semibold" style={{ color: "#c14600" }}>+{fmtU(Number(r.amount))}</td>
                <td className="num" style={{ color: "#595959" }}>{r.refId ? `${r.refId.slice(0, 10)}…` : "—"}</td>
                <td style={{ color: "#595959" }}>{fmtVN(r.createdAt.toISOString(), true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
