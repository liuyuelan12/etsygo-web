import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN } from "@/lib/format";
import { getDict, tpl } from "@/lib/i18n-server";
import InviteCopy from "@/components/user/InviteCopy";
import TierSetter from "@/components/user/TierSetter";
import InfoDot from "@/components/user/InfoDot";
import ClaimCommissionButton from "@/components/user/ClaimCommissionButton";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const tm = t.team;
  const isAgent = user.isAgent;

  const rels = await prisma.agentRelation.findMany({
    where: { ancestorId: user.id },
    include: { descendant: { include: { balance: true } } },
    orderBy: { depth: "asc" },
  });
  const teamSize = rels.length;
  const teamPerf = rels.reduce((s, r) => s + Number(r.descendant.balance?.totalInvested ?? 0), 0);

  // 累计佣金=全部佣金记录之和；可领=未领取(claimedAt=null)之和（动态佣金改为手动领取）
  const [commTotalAgg, commPendingAgg] = await Promise.all([
    prisma.commissionRecord.aggregate({ where: { beneficiaryId: user.id }, _sum: { amount: true } }),
    prisma.commissionRecord.aggregate({ where: { beneficiaryId: user.id, claimedAt: null }, _sum: { amount: true } }),
  ]);
  const commEarned = Number(commTotalAgg._sum.amount ?? 0);
  const commPending = Number(commPendingAgg._sum.amount ?? 0);
  const myPct = user.commissionTier * 5;

  const commRecords = await prisma.commissionRecord.findMany({
    where: { beneficiaryId: user.id },
    include: { sourceUser: true, sourceOrder: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  // 按来源订单聚合：同一单（下级的某笔投资）本人累计分得多少。records 已按 createdAt desc，首见即最新。
  const commByOrder = new Map<string, { email: string; orderAmount: number | null; amount: number; lastDate: string }>();
  for (const c of commRecords) {
    const key = c.sourceOrderId ?? `nil:${c.id}`;
    const prev = commByOrder.get(key);
    if (prev) prev.amount += Number(c.amount);
    else commByOrder.set(key, { email: c.sourceUser.username ?? c.sourceUser.email, orderAmount: c.sourceOrder ? Number(c.sourceOrder.tierAmount) : null, amount: Number(c.amount), lastDate: c.date });
  }
  const commGroups = Array.from(commByOrder.values());

  const byLevel = [1, 2, 3].map((lv) => ({ lv, members: rels.filter((r) => r.depth === lv) }));

  return (
    <div className="px-4 pb-6">
      <header className="pt-3 pb-1">
        <div className="eyebrow">{isAgent ? tm.eyebrowAgent : tm.eyebrowUser}</div>
        <h1 className="font-serif text-[1.5rem] font-bold">{tm.title}</h1>
      </header>

      {isAgent ? (
        <section className="tag rise mt-3 px-5 pb-5 pt-6" style={{ background: "#2e2740", borderColor: "#2e2740", color: "#fff" }}>
          <span className="eyebrow" style={{ color: "#f1641e" }}>{tm.myAlliance}</span>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Big label={tm.teamSize} value={`${teamSize}`} unit={tm.people} />
            <Big label={tm.myTier} value={`${myPct}`} unit="%" mid tone />
            <Big label={tm.totalComm} value={fmtU(commEarned)} unit="U" tone tip={t.tips.totalIncome} tipAlign="right" />
          </div>
          <p className="mt-3 text-center text-[0.66rem]" style={{ color: "#b7b1cb" }}>{tpl(tm.teamPerfNote, { amount: fmtUInt(teamPerf) })}</p>
          <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[0.72rem]" style={{ color: "#b7b1cb" }}>{tm.claimable}</span>
              <span className="font-num text-[1.1rem] font-semibold" style={{ color: "#ff9a5c" }}>{fmtU(commPending)} U</span>
            </div>
            {commPending > 0 && (
              <div className="mt-2.5">
                <ClaimCommissionButton amount={fmtU(commPending)} t={{ claim: tm.claimComm, claiming: tm.claiming, claimed: tm.claimedComm, none: tm.noComm }} />
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="paper mt-3 px-5 py-5 text-center">
          <div className="text-2xl" aria-hidden>🪡</div>
          <p className="mt-2 font-serif text-[1rem] font-semibold">{tm.inviteTitle}</p>
          <p className="mt-1 text-[0.74rem]" style={{ color: "#757575" }}>{tm.inviteDesc}</p>
        </section>
      )}

      <section className="paper mt-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[0.78rem] font-semibold">{tm.inviteCode}</div>
            <div className="font-num mt-0.5 text-[1.05rem] font-semibold tracking-wider" style={{ color: "#f1641e" }}>{user.id.slice(0, 10)}</div>
          </div>
          <span className="text-3xl" aria-hidden>🎁</span>
        </div>
        <div className="mt-3">
          <InviteCopy code={user.id} copyLabel={tm.copyLink} copiedLabel={tm.copied} />
        </div>
      </section>

      {isAgent && (
        <section className="mt-5">
          <h2 className="font-serif text-[1.05rem] font-bold">{tm.commRecords}</h2>
          {commGroups.length === 0 ? (
            <p className="mt-2 text-[0.78rem]" style={{ color: "#757575" }}>{tm.noCommRecords}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {commGroups.map((g, i) => (
                <div key={i} className="paper flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-[0.82rem]">
                      {g.orderAmount != null ? tpl(tm.commFromOrder, { email: g.email, amount: fmtUInt(g.orderAmount) }) : tpl(tm.commFrom, { email: g.email })}
                    </div>
                    <div className="text-[0.64rem]" style={{ color: "#8c8c8c" }}>{g.lastDate} · {tm.commEarnedFromOrder}</div>
                  </div>
                  <span className="font-num text-[0.95rem] font-semibold" style={{ color: "#c14600" }}>+{fmtU(g.amount)} U</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-5">
        <h2 className="font-serif text-[1.05rem] font-bold">{isAgent ? tm.downlineAgent : tm.downlineUser}</h2>
        {teamSize === 0 ? (
          <p className="mt-2 text-[0.78rem]" style={{ color: "#757575" }}>{tm.noDownline}</p>
        ) : (
          <div className="mt-2 space-y-4">
            {byLevel.map(({ lv, members }) =>
              members.length === 0 ? null : (
                <div key={lv}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-[0.72rem] font-bold" style={{ color: "#f1641e" }}>{tpl(tm.layer, { n: lv })}</span>
                    <span className="text-[0.66rem]" style={{ color: "#8c8c8c" }}>{members.length}</span>
                    <span className="h-px flex-1" style={{ background: "#e6e6ea" }} />
                  </div>
                  <div className="paper divide-y" style={{ borderColor: "#e6e6ea" }}>
                    {members.map((r) => (
                      <div key={r.descendantId} className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "#e6e6ea" }}>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-full font-serif text-sm" style={{ background: "#eeeef1", color: "#595959" }}>
                            {r.descendant.email[0].toUpperCase()}
                          </span>
                          <div>
                            <div className="text-[0.82rem]">{r.descendant.email}</div>
                            <div className="text-[0.64rem]" style={{ color: "#8c8c8c" }}>
                              {tpl(tm.invested, { amount: fmtUInt(Number(r.descendant.balance?.totalInvested ?? 0)), date: fmtVN(r.descendant.createdAt.toISOString()) })}
                            </div>
                          </div>
                        </div>
                        {isAgent && lv === 1 ? (
                          <TierSetter downlineId={r.descendantId} current={r.descendant.commissionTier} label={tm.setTier} confirmLabel={tm.confirm} max={user.commissionTier} />
                        ) : (
                          isAgent && (
                            <span className="text-[0.72rem]" style={{ color: r.descendant.isAgent ? "#f1641e" : "#bdbdbd" }}>
                              {r.descendant.isAgent ? `${r.descendant.commissionTier * 5}%` : "—"}
                            </span>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Big({ label, value, unit, mid, tone, tip, tipAlign }: { label: string; value: string; unit: string; mid?: boolean; tone?: boolean; tip?: string; tipAlign?: "center" | "right" }) {
  return (
    <div className={`text-center ${mid ? "border-x" : ""}`} style={mid ? { borderColor: "rgba(255,255,255,0.15)" } : undefined}>
      <div className="font-num text-[1.5rem] leading-none" style={{ color: tone ? "#ff9a5c" : "#fff" }}>
        {value}
        <span className="text-[0.78rem]"> {unit}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[0.66rem]" style={{ color: "#b7b1cb" }}>
        {label}
        {tip && <InfoDot text={tip} tone="dark" align={tipAlign ?? "center"} />}
      </div>
    </div>
  );
}
