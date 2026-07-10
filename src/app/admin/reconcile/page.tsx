import Panel from "@/components/admin/Panel";
import { reconcileAll } from "@/lib/reconcile";

export const dynamic = "force-dynamic";

export default async function AdminReconcilePage() {
  const { checked, mismatches } = await reconcileAll();
  const ok = mismatches.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">资金对账</div>
        <h1 className="font-serif text-[1.6rem] font-bold">账本一致性核对</h1>
      </div>

      <div className="paper flex items-center gap-3 px-5 py-3.5">
        <span className={`seal ${ok ? "seal-orange" : "seal-red"}`}>{ok ? "全部一致" : `${mismatches.length} 个异常`}</span>
        <span className="text-[0.78rem]" style={{ color: "#595959" }}>
          已核对 {checked} 个账户 · 不变量：可用余额 = Σ账本流水；锁定 = Σ待审提现。异常=有漏记/多记/漂移的资金，需人工核查。
        </span>
      </div>

      {ok ? (
        <Panel title="核对结果" desc="账本 = 余额">
          <div className="px-4 py-8 text-center text-[0.9rem]" style={{ color: "#2f7d31" }}>✓ 所有账户余额与账本流水完全一致</div>
        </Panel>
      ) : (
        <Panel title="异常账户" desc={`${mismatches.length} 个`}>
          <table className="atable">
            <thead>
              <tr>
                <th>邮箱</th>
                <th className="right">可用余额</th>
                <th className="right">Σ账本</th>
                <th className="right">差额</th>
                <th className="right">锁定</th>
                <th className="right">Σ待审提现</th>
                <th className="right">差额</th>
              </tr>
            </thead>
            <tbody>
              {mismatches.map((m) => (
                <tr key={m.userId}>
                  <td className="font-medium">{m.email}</td>
                  <td className="num right">{m.available}</td>
                  <td className="num right">{m.ledgerSum}</td>
                  <td className="num right" style={{ color: m.availDiff !== "0.000000" ? "#c0152f" : "#595959" }}>{m.availDiff}</td>
                  <td className="num right">{m.locked}</td>
                  <td className="num right">{m.pendingWithdraw}</td>
                  <td className="num right" style={{ color: m.lockDiff !== "0.000000" ? "#c0152f" : "#595959" }}>{m.lockDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
