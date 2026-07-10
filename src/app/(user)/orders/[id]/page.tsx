import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { fmtU, fmtUInt, fmtVN } from "@/lib/format";
import { getDict, tpl } from "@/lib/i18n-server";
import Seal from "@/components/Seal";
import ClaimButton from "@/components/user/ClaimButton";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const o = t.order;
  const h = t.home;

  const order = await prisma.investmentOrder.findUnique({
    where: { id },
    include: { _count: { select: { interests: true } }, interests: { orderBy: { date: "desc" }, take: 30 } },
  });
  if (!order || order.userId !== user.id) notFound();

  const creditedDays = order._count.interests;
  const dailyAmount = Number(order.tierAmount) * Number(order.dailyRate);
  const elapsedDays = Math.min(order.periodDays, Math.floor((Date.now() - order.startedAt.getTime()) / 86400000));
  const claimableDays = order.status === "active" ? Math.max(0, elapsedDays - creditedDays) : 0;
  const claimableAmount = claimableDays * dailyAmount;
  const nextClaimAt = new Date(order.startedAt.getTime() + (creditedDays + 1) * 86400000);

  const statusLabel: Record<string, string> = { active: h.statusActive, matured: h.statusMatured, exited: h.statusExited };
  const statusTone = (s: string) => (s === "active" ? "orange" : "ink") as "orange" | "ink";

  return (
    <div className="px-4 pb-8">
      <header className="flex items-center gap-2 pt-3 pb-2">
        <Link href="/" style={{ color: "#757575" }}>←</Link>
        <div>
          <div className="eyebrow">{order.mode === "solo" ? h.solo : h.pin}</div>
          <h1 className="font-serif text-[1.4rem] font-bold">{o.title}</h1>
        </div>
      </header>

      <section className="tag mt-2 px-5 pb-5 pt-6" style={{ background: "#2e2740", borderColor: "#2e2740", color: "#fff" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[0.72rem]" style={{ color: "#b7b1cb" }}>{o.amount}</div>
            <div className="font-num text-[2.2rem] leading-none">{fmtUInt(Number(order.tierAmount))} <span className="text-base">U</span></div>
          </div>
          <Seal tone={statusTone(order.status)}>{statusLabel[order.status] ?? order.status}</Seal>
        </div>
        {order.etsygoShop && <div className="mt-2 text-[0.72rem]" style={{ color: "#c7c7cf" }}>🏷 {order.etsygoShop}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="text-center">
            <div className="font-num text-[0.98rem] font-semibold">{fmtU(Number(order.earned))} U</div>
            <div className="text-[0.66rem]" style={{ color: "#b7b1cb" }}>{o.earned}</div>
          </div>
          <div className="text-center border-l" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <div className="font-num text-[0.98rem] font-semibold">{creditedDays}/{order.periodDays}</div>
            <div className="text-[0.66rem]" style={{ color: "#b7b1cb" }}>{o.daysLabel}</div>
          </div>
        </div>
      </section>

      <section className="paper mt-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{o.claimTitle}</span>
          <span className="text-[0.7rem]" style={{ color: "#8c8c8c" }}>{tpl(o.perDay, { amount: fmtU(dailyAmount) })}</span>
        </div>
        <div className="mt-3">
          {order.status === "matured" ? (
            <p className="text-center text-[0.82rem]" style={{ color: "#595959" }}>{o.matured}</p>
          ) : order.status === "exited" ? (
            <p className="text-center text-[0.82rem]" style={{ color: "#595959" }}>{o.exited}</p>
          ) : claimableDays > 0 ? (
            <ClaimButton
              orderId={order.id}
              amount={fmtU(claimableAmount)}
              days={claimableDays}
              t={{ claimBtn: o.claimBtn, claiming: o.claiming, claimDone: o.claimDone, claimNone: o.claimNone }}
            />
          ) : creditedDays >= order.periodDays ? (
            <p className="text-center text-[0.82rem]" style={{ color: "#595959" }}>{o.allClaimed}</p>
          ) : (
            <p className="text-center text-[0.82rem]" style={{ color: "#595959" }}>{tpl(o.nextClaim, { time: fmtVN(nextClaimAt.toISOString(), true) })}</p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[0.68rem]" style={{ color: "#8c8c8c" }}>
          <div>{o.started}<div className="font-num text-[0.82rem]" style={{ color: "#222222" }}>{fmtVN(order.startedAt.toISOString(), true)}</div></div>
          <div>{o.matures}<div className="font-num text-[0.82rem]" style={{ color: "#222222" }}>{fmtVN(order.maturesAt.toISOString())}</div></div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="font-serif text-[1.05rem] font-bold">{o.records}</h2>
        {order.interests.length === 0 ? (
          <p className="mt-2 text-[0.78rem]" style={{ color: "#8c8c8c" }}>{o.noRecords}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {order.interests.map((ir) => (
              <div key={ir.id} className="paper flex items-center justify-between px-4 py-2.5">
                <span className="text-[0.78rem]" style={{ color: "#757575" }}>{ir.date}</span>
                <span className="font-num text-[0.9rem] font-semibold" style={{ color: "#c14600" }}>+{fmtU(Number(ir.amount))} U</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
