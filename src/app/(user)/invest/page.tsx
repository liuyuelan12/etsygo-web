import { redirect } from "next/navigation";
import InvestPicker from "@/components/user/InvestPicker";
import { getCurrentUser } from "@/lib/session-user";
import { getTiers } from "@/lib/settings";
import { getDict } from "@/lib/i18n-server";

export default async function InvestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const iv = t.invest;
  const tiers = await getTiers();
  const available = Number(user.balance?.available ?? 0);

  return (
    <div className="px-4 pb-6">
      <header className="pt-3 pb-1">
        <div className="eyebrow">{iv.eyebrow}</div>
        <h1 className="font-serif text-[1.5rem] font-bold">{iv.title}</h1>
        <p className="mt-1 text-[0.8rem]" style={{ color: "#757575" }}>{iv.subtitle}</p>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="paper px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>🧺</span>
            <span className="font-serif font-semibold">{iv.pinMode}</span>
          </div>
          <p className="mt-1 text-[0.72rem]" style={{ color: "#757575" }}>{iv.pinDesc}</p>
        </div>
        <div className="paper px-3.5 py-3" style={{ boxShadow: "inset 0 0 0 1.5px #ddd9e8" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>🏠</span>
            <span className="font-serif font-semibold">{iv.soloMode}</span>
          </div>
          <p className="mt-1 text-[0.72rem]" style={{ color: "#757575" }}>{iv.soloDesc}</p>
        </div>
      </div>

      <InvestPicker tiers={tiers} available={available} t={iv} tips={{ dailyIncome: t.tips.dailyIncome, matureIncome: t.tips.matureIncome }} />
    </div>
  );
}
