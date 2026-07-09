import Panel from "@/components/admin/Panel";
import { prisma } from "@/lib/db";
import { fmtVN } from "@/lib/format";

export default async function AdminLogsPage() {
  const logs = await prisma.operationLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">操作日志</div>
        <h1 className="font-serif text-[1.6rem] font-bold">审计日志</h1>
      </div>
      <Panel title="操作记录" desc="关键操作留痕：操作人 / 时间 / 旧值 / 新值">
        <table className="atable">
          <thead>
            <tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>旧值</th><th>新值</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} style={{ color: "#8c8c8c" }}>暂无操作记录</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id}>
                <td style={{ color: "#595959" }}>{fmtVN(l.createdAt.toISOString(), true)}</td>
                <td className="font-medium">{l.operator}</td>
                <td><span className="rounded-full px-2 py-0.5 text-[0.72rem] font-semibold" style={{ background: "#eeeef1", color: "#595959" }}>{l.action}</span></td>
                <td className="num">{l.target?.slice(0, 12)}</td>
                <td style={{ color: "#8c8c8c" }}>{l.before ?? "—"}</td>
                <td style={{ color: "#222222" }}>{l.after ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
