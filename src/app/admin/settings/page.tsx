import SettingEditor from "@/components/admin/SettingEditor";
import { getSettingsMap } from "@/lib/settings";

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "invest.tiers", label: "投资档位", hint: "8 档 JSON：amount 金额、mode(pin拼店/solo独立店)、dailyRatePct 日收益率%、periodDays 周期天数" },
  { key: "withdraw.fee", label: "提现手续费规则", hint: "JSON：feeFreeAfterDays 满几天免费、pctUnder 未满收百分之几" },
  { key: "withdraw.window", label: "提现时间窗口", hint: "JSON：days 每月哪几日、startHour/endHour 时段、tzOffset 时区(7=UTC+7)" },
  { key: "withdraw.enforceWindow", label: "是否强制提现窗口", hint: "true=严格限制在窗口内提交；上线应保持 true" },
  { key: "interest.payoutHour", label: "计息发放时点", hint: "每日几点(UTC+7)发放收益，当前 2 = 凌晨 02:00" },
  { key: "earlyExit.penaltyPct", label: "提前退出违约金%", hint: "未满周期退出扣本金百分比，当前 30" },
  { key: "agent.minInvestForAgent", label: "代理资格门槛(U)", hint: "上线须投资≥此值才参与分佣，当前 300" },
];

export default async function AdminSettingsPage() {
  const map = await getSettingsMap();

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow">参数配置</div>
        <h1 className="font-serif text-[1.6rem] font-bold">业务参数</h1>
        <p className="mt-1 text-[0.8rem]" style={{ color: "#757575" }}>
          改动即时生效，无需重新部署；关键改动会记入操作日志。
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {FIELDS.map((f) => (
          <SettingEditor key={f.key} settingKey={f.key} label={f.label} hint={f.hint} value={map[f.key] ?? ""} />
        ))}
      </div>
    </div>
  );
}
