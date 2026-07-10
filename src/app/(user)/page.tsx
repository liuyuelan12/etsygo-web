import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN } from "@/lib/format";
import { getDict } from "@/lib/i18n-server";
import { tpl } from "@/lib/i18n";
import LogoutLink from "@/components/user/LogoutLink";
import WalletButton from "@/components/user/WalletButton";
import InfoDot from "@/components/user/InfoDot";
import Seal from "@/components/Seal";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const h = t.home;

  const available = Number(user.balance?.available ?? 0);
  const totalInvested = Number(user.balance?.totalInvested ?? 0);

  const orders = await prisma.investmentOrder.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
  });
  const incomeAgg = await prisma.ledgerEntry.aggregate({
    where: { userId: user.id, type: { in: ["interest", "commission"] } },
    _sum: { amount: true },
  });
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);

  const statusLabel: Record<string, string> = { active: h.statusActive, matured: h.statusMatured, exited: h.statusExited };
  const statusTone = (s: string) => (s === "active" ? "orange" : "ink") as "orange" | "ink";

  return (
    <div className="px-4">
      <header className="flex items-center justify-between pt-2 pb-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/etsygo-icon.svg" alt="EtsyGo" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-serif text-[1.05rem] font-bold">EtsyGo</div>
            <div className="text-[0.66rem]" style={{ color: "#757575" }}>{user.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
          <LogoutLink className="rounded-full px-3 py-1 text-[0.72rem] font-semibold" style={{ background: "#f5f5f7", color: "#595959", boxShadow: "inset 0 0 0 1px #dcdce1" }} />
        </div>
      </header>

      <section className="tag rise px-5 pb-5 pt-6" style={{ background: "#2e2740", borderColor: "#2e2740", color: "#fff", boxShadow: "0 20px 44px -26px rgba(46,39,64,0.85)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow" style={{ color: "#f1641e" }}>{h.workshop}</div>
            <p className="font-hand mt-1 text-[1.3rem] leading-snug" style={{ color: "#f3f1f8" }}>
              {orders.length > 0 ? tpl(h.storesActive, { n: orders.length }) : h.openFirst}
            </p>
          </div>
          {user.status === "frozen" ? <Seal tone="red">{t.common.frozen}</Seal> : <Seal tone="orange">{t.common.normal}</Seal>}
        </div>

        <div className="mt-4">
          <div className="text-[0.72rem]" style={{ color: "#b7b1cb" }}>{h.available}</div>
          <div className="font-num text-[2.7rem] leading-none" style={{ color: "#fff" }}>{fmtU(available)}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
          <Stat label={h.totalInvested} value={`${fmtUInt(totalInvested)} U`} dark />
          <Stat label={h.totalIncome} value={`${fmtU(totalIncome)} U`} mid dark tip={t.tips.totalIncome} tipAlign="right" />
        </div>
      </section>

      <div className="rise rise-2 mt-3 grid grid-cols-2 gap-2.5">
        <Link href="/deposit" className="flex items-center gap-2 rounded-2xl px-4 py-3.5" style={{ background: "#fff", boxShadow: "inset 0 0 0 1px #dcdce1" }}>
          <span className="text-xl" aria-hidden>💵</span>
          <div>
            <div className="font-serif text-[0.92rem] font-semibold">{h.deposit}</div>
            <div className="text-[0.66rem]" style={{ color: "#757575" }}>{h.depositSub}</div>
          </div>
        </Link>
        <Link href="/invest" className="flex items-center gap-2 rounded-2xl px-4 py-3.5" style={{ background: "#2e2740", color: "#f4f4f6" }}>
          <span className="text-xl" aria-hidden>🧵</span>
          <div>
            <div className="font-serif text-[0.92rem] font-semibold">{h.open}</div>
            <div className="text-[0.66rem]" style={{ color: "#c7c7cf" }}>{h.openSub}</div>
          </div>
        </Link>
      </div>

      <section className="rise rise-3 mt-5 pb-6">
        <h2 className="font-serif text-[1.05rem] font-bold">{h.myStores}</h2>
        {orders.length === 0 ? (
          <div className="paper mt-2 px-5 py-8 text-center">
            <div className="text-2xl" aria-hidden>🪡</div>
            <p className="mt-2 text-[0.86rem]" style={{ color: "#595959" }}>{h.noStores}</p>
            <p className="text-[0.72rem]" style={{ color: "#8c8c8c" }}>{h.noStoresHint}</p>
          </div>
        ) : (
          <>
            <div className="mt-3 space-y-2.5">
              {orders.map((o) => {
                const statusText = o.status === "active" ? h.shopRunning : (statusLabel[o.status] ?? o.status);
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} className="paper flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-10 w-10 place-items-center rounded-xl text-lg" style={{ background: o.mode === "solo" ? "#efedf4" : "#fdeee6" }} aria-hidden>
                        {o.mode === "solo" ? "🏠" : "🧺"}
                      </span>
                      <div>
                        <div className="font-serif font-semibold">{tpl(h.investedSuccess, { amount: fmtUInt(Number(o.tierAmount)) })}</div>
                        <div className="text-[0.68rem]" style={{ color: "#757575" }}>{fmtVN(o.startedAt.toISOString(), true)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Seal tone={statusTone(o.status)}>{statusText}</Seal>
                      <span style={{ color: "#bdbdbd" }}>›</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
        <p className="mt-4 text-center text-[0.64rem]" style={{ color: "#8c8c8c" }}>{t.common.networkNote}</p>
      </section>
    </div>
  );
}

function Stat({ label, value, mid, dark, tip, tipAlign }: { label: string; value: string; mid?: boolean; dark?: boolean; tip?: string; tipAlign?: "center" | "right" }) {
  return (
    <div className={`text-center ${mid ? "border-x" : ""}`} style={mid ? { borderColor: dark ? "rgba(255,255,255,0.15)" : "#e6e6ea" } : undefined}>
      <div className="font-num text-[0.98rem] font-semibold" style={{ color: dark ? "#fff" : "#222222" }}>{value}</div>
      <div className="flex items-center justify-center gap-1 text-[0.66rem]" style={{ color: dark ? "#b7b1cb" : "#757575" }}>
        {label}
        {tip && <InfoDot text={tip} tone={dark ? "dark" : "light"} align={tipAlign ?? "center"} />}
      </div>
    </div>
  );
}
