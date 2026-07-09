import CommissionConfig from "@/components/admin/CommissionConfig";
import { prisma } from "@/lib/db";

export default async function AdminCommissionPage() {
  const configs = await prisma.commissionConfig.findMany({ orderBy: { level: "asc" } });
  const rows = configs.map((c) => ({ level: c.level, pct: Number(c.pct), enabled: c.enabled, needSpecialPerm: c.needSpecialPerm }));

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">佣金配置</div>
        <h1 className="font-serif text-[1.6rem] font-bold">分销佣金档位</h1>
        <p className="mt-1 text-[0.8rem]" style={{ color: "#757575" }}>
          级差制：下级每日收益按上线代理等级分佣，最高 50%。改动即时生效并记日志。
        </p>
      </div>
      <CommissionConfig rows={rows} />
      <p className="text-[0.72rem]" style={{ color: "#757575" }}>
        说明：手机端仅展示 ≤40% 档；50% 档仅超级管理员可开启；上线须投资 ≥300U 才参与分佣。
      </p>
    </div>
  );
}
