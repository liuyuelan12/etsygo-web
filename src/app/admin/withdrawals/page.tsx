import Panel from "@/components/admin/Panel";
import { StatusSeal } from "@/components/Seal";
import WithdrawAction from "@/components/admin/WithdrawAction";
import { prisma } from "@/lib/db";
import { fmtU, fmtVN, withdrawOrderNo } from "@/lib/format";

const LABEL: Record<string, string> = { pending: "审核中", approved: "出款中", paid: "已到账", rejected: "已驳回", canceled: "已取消" };

export default async function AdminWithdrawalsPage() {
  const rows = await prisma.withdrawOrder.findMany({
    orderBy: { submittedAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });
  const pending = rows.filter((w) => w.status === "pending").length;

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">提现审核</div>
        <h1 className="font-serif text-[1.6rem] font-bold">提现审批台</h1>
      </div>

      <div className="paper flex items-center gap-3 px-5 py-3.5">
        <span className="seal seal-plum">待处理 {pending}</span>
        <span className="text-[0.78rem]" style={{ color: "#595959" }}>
          通过 → 从热钱包链上出款(净额=金额−手续费);驳回 → 解冻退回余额。窗口 1/15 日 10–22(UTC+7)。
        </span>
      </div>

      <Panel title="提现申请" desc={`共 ${rows.length} 笔`}>
        <table className="atable">
          <thead>
            <tr>
              <th>单号</th><th>用户</th><th className="right">金额(U)</th><th className="right">手续费</th>
              <th>到账地址</th><th>提交</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td className="num">{withdrawOrderNo(w)}</td>
                <td>{w.user.email}</td>
                <td className="num right font-semibold">{fmtU(Number(w.amount))}</td>
                <td className="num right" style={{ color: Number(w.fee) > 0 ? "#c0152f" : "#595959" }}>{fmtU(Number(w.fee))}</td>
                <td className="num" style={{ color: "#595959" }}>{w.toAddress.slice(0, 10)}…{w.txHash ? ` · tx ${w.txHash.slice(0, 8)}…` : ""}</td>
                <td style={{ color: "#595959" }}>{fmtVN(w.submittedAt.toISOString(), true)}</td>
                <td><StatusSeal status={LABEL[w.status] ?? w.status} /></td>
                <td>{w.status === "pending" ? <WithdrawAction id={w.id} /> : <span style={{ color: "#bdbdbd" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
