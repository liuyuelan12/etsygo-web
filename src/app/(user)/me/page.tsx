import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN, daysSince } from "@/lib/format";
import { getDict, tpl } from "@/lib/i18n-server";
import Seal from "@/components/Seal";
import LogoutLink from "@/components/user/LogoutLink";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const m = t.me;

  const available = Number(user.balance?.available ?? 0);
  const totalInvested = Number(user.balance?.totalInvested ?? 0);
  const incomeAgg = await prisma.ledgerEntry.aggregate({ where: { userId: user.id, type: { in: ["interest", "commission"] } }, _sum: { amount: true } });
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const days = Math.max(0, daysSince(user.registeredAt.toISOString(), new Date().toISOString()));

  return (
    <div className="px-4 pb-8">
      <header className="flex items-center gap-3 pt-4 pb-2">
        <span className="grid h-14 w-14 place-items-center rounded-2xl font-serif text-2xl" style={{ background: "#f1641e", color: "#fff" }}>
          {(user.username ?? user.email)[0].toUpperCase()}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[1.05rem] font-bold">{user.username ?? user.email}</span>
            {user.status === "frozen" ? <Seal tone="red">{m.frozen}</Seal> : <Seal tone="orange">{m.normal}</Seal>}
          </div>
          <div className="text-[0.7rem]" style={{ color: "#8c8c8c" }}>{user.email}</div>
          <div className="text-[0.72rem]" style={{ color: "#757575" }}>
            {tpl(m.registerAt, { date: fmtVN(user.registeredAt.toISOString()), n: `${days} ${m.days}` })}
            {user.isAgent ? tpl(m.agentBadge, { pct: user.commissionTier * 5 }) : ""}
          </div>
        </div>
      </header>

      <section className="paper mt-2 grid grid-cols-3 px-3 py-4">
        <Asset label={m.availBal} value={fmtU(available)} u={m.u} />
        <Asset label={m.totalInvested} value={fmtUInt(totalInvested)} mid u={m.u} />
        <Asset label={m.totalIncome} value={fmtU(totalIncome)} u={m.u} />
      </section>

      <section className="tag mt-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{m.etsyBind}</span>
          <span className="text-lg" aria-hidden>🏷️</span>
        </div>
        {user.etsygoShop ? (
          <div className="font-num mt-2 text-[1.2rem] font-semibold" style={{ color: "#222222" }}>{user.etsygoShop}</div>
        ) : (
          <p className="mt-2 text-[0.8rem]" style={{ color: "#595959" }}>{m.etsyNone}</p>
        )}
      </section>

      <section className="paper mt-3 overflow-hidden">
        <Item icon="💵" label={m.itemDeposit} href="/deposit" />
        <Item icon="🪡" label={m.itemTeam} href="/team" />
        <Item icon="🧾" label={m.itemWithdraw} href="/withdraw" />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-3 text-[0.9rem]"><span aria-hidden>🚪</span>{m.itemLogout}</span>
          <LogoutLink className="text-[0.78rem] font-semibold" style={{ color: "#f1641e" }} />
        </div>
      </section>

      <Link href="/admin" className="mt-5 flex items-center justify-center gap-2 rounded-xl py-3 text-[0.82rem] font-semibold" style={{ background: "#2e2740", color: "#f4f4f6" }}>
        {m.adminEntry}
      </Link>
      <p className="mt-3 text-center text-[0.64rem]" style={{ color: "#8c8c8c" }}>{t.common.networkNote}</p>
    </div>
  );
}

function Asset({ label, value, mid, u }: { label: string; value: string; mid?: boolean; u: string }) {
  return (
    <div className={`text-center ${mid ? "border-x" : ""}`} style={mid ? { borderColor: "#e6e6ea" } : undefined}>
      <div className="font-num text-[1.1rem] font-semibold">{value}</div>
      <div className="text-[0.66rem]" style={{ color: "#757575" }}>{label} {u}</div>
    </div>
  );
}

function Item({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid #e6e6ea" }}>
      <span className="flex items-center gap-3 text-[0.9rem]"><span aria-hidden>{icon}</span>{label}</span>
      <span style={{ color: "#bdbdbd" }}>›</span>
    </Link>
  );
}
