import Panel from "@/components/admin/Panel";
import AdminUserActions from "@/components/admin/AdminUserActions";
import { prisma } from "@/lib/db";
import { fmtU } from "@/lib/format";

type UNode = {
  id: string;
  email: string;
  username: string | null;
  isAgent: boolean;
  commissionTier: number;
  status: string;
  totalInvested: number;
  referrerId: string | null;
};

export default async function AdminTeamPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { balance: { select: { totalInvested: true } } },
  });
  const nodes: UNode[] = users.map((u) => ({
    id: u.id, email: u.email, username: u.username, isAgent: u.isAgent,
    commissionTier: u.commissionTier, status: u.status,
    totalInvested: Number(u.balance?.totalInvested ?? 0), referrerId: u.referrerId,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, UNode[]>();
  const roots: UNode[] = [];
  for (const n of nodes) {
    if (n.referrerId && byId.has(n.referrerId)) {
      const arr = children.get(n.referrerId) ?? [];
      arr.push(n);
      children.set(n.referrerId, arr);
    } else {
      roots.push(n);
    }
  }

  function rows(node: UNode, depth: number): React.ReactElement[] {
    const kids = children.get(node.id) ?? [];
    const row = (
      <div key={node.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #f0f0f2" }}>
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 22 }}>
          {depth > 0 && <span style={{ color: "#bdbdbd" }}>↳</span>}
          <div>
            <div className="text-[0.86rem] font-medium">
              {node.username ?? node.email}
              {node.isAgent && <span className="seal seal-orange ml-2">{node.commissionTier * 5}%</span>}
              {node.status === "frozen" && <span className="seal seal-red ml-1">冻结</span>}
            </div>
            <div className="text-[0.66rem]" style={{ color: "#8c8c8c" }}>{node.email} · 投资 {fmtU(node.totalInvested)} U</div>
          </div>
        </div>
        <AdminUserActions userId={node.id} status={node.status} tier={node.commissionTier} />
      </div>
    );
    return [row, ...kids.flatMap((k) => rows(k, depth + 1))];
  }

  const treeRoots = roots.filter((r) => (children.get(r.id)?.length ?? 0) > 0);
  const standalone = roots.length - treeRoots.length;

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">邀请关系</div>
        <h1 className="font-serif text-[1.6rem] font-bold">团队邀请树</h1>
      </div>

      <div className="paper flex items-center gap-3 px-5 py-3.5">
        <span className="seal seal-plum">{treeRoots.length} 条线</span>
        <span className="text-[0.78rem]" style={{ color: "#595959" }}>
          缩进表示上下级；右侧可直接设代理等级/冻结。另有 {standalone} 名无邀请关系的独立用户。
        </span>
      </div>

      {treeRoots.length === 0 ? (
        <Panel title="邀请关系" desc="暂无"><div className="px-4 py-6 text-[0.82rem]" style={{ color: "#8c8c8c" }}>还没有任何邀请关系。</div></Panel>
      ) : (
        treeRoots.map((root) => (
          <Panel key={root.id} title={root.username ?? root.email} desc={`${(children.get(root.id)?.length ?? 0)} 名直推`}>
            <div>{rows(root, 0)}</div>
          </Panel>
        ))
      )}
    </div>
  );
}
