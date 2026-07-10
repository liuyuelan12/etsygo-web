import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { maxWithdrawable, feeFor } from "@/lib/withdraw";
import { fmtU, fmtVN, daysSince, withdrawOrderNo } from "@/lib/format";
import { getDict, tpl } from "@/lib/i18n-server";
import Seal from "@/components/Seal";
import InfoDot from "@/components/user/InfoDot";
import WithdrawForm from "@/components/user/WithdrawForm";
import WithdrawActions from "@/components/user/WithdrawActions";
import EarlyRedeemPanel from "@/components/user/EarlyRedeemPanel";

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user || !user.balance) redirect("/login");
  const { t } = await getDict();
  const w = t.withdraw;

  const bal = user.balance;
  const max = maxWithdrawable(bal);
  const feeFree = feeFor(user.registeredAt, 100).fee.isZero();

  const statusLabel: Record<string, string> = { pending: w.statusPending, approved: w.statusApproved, paid: w.statusPaid, rejected: w.statusRejected, canceled: w.statusCanceled };
  const statusTone: Record<string, "orange" | "plum" | "red" | "ink"> = { pending: "plum", approved: "plum", paid: "orange", rejected: "red", canceled: "ink" };

  const activeOrders = await prisma.investmentOrder.findMany({ where: { userId: user.id, status: "active" }, orderBy: { startedAt: "desc" } });
  const activeInvested = activeOrders.reduce((s, o) => s + Number(o.tierAmount), 0);
  const rows = await prisma.withdrawOrder.findMany({ where: { userId: user.id }, orderBy: { submittedAt: "desc" }, take: 50 });

  return (
    <div className="px-4 pb-6">
      <header className="pt-3 pb-1">
        <div className="eyebrow">{w.eyebrow}</div>
        <h1 className="font-serif text-[1.5rem] font-bold">{w.title}</h1>
      </header>

      <section className="tag mt-3 px-5 pb-5 pt-7">
        <span className="eyebrow inline-flex items-center gap-1">{w.maxLabel}<InfoDot text={t.tips.quota} /></span>
        <div className="font-num mt-1 text-[2.6rem] leading-none">{fmtU(max)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl px-3 py-3" style={{ background: "#f4f4f6" }}>
          <Cell label={w.activeInvested} value={`${fmtU(activeInvested)}`} tip={t.tips.activeInvested} />
          <Cell label={w.used} value={`${fmtU(Number(bal.usedWithdraw))}`} mid tip={t.tips.used} />
          <Cell label={w.locked} value={`${fmtU(Number(bal.locked))}`} tip={t.tips.locked} tipAlign="right" />
        </div>
        <p className="mt-2 text-center text-[0.64rem]" style={{ color: "#8c8c8c" }}>{w.quotaNote}</p>
      </section>

      <EarlyRedeemPanel
        orders={activeOrders.map((o) => ({ id: o.id, mode: o.mode, amount: Number(o.tierAmount) }))}
        t={{ redeemTitle: w.redeemTitle, redeemDesc: w.redeemDesc, redeemNone: w.redeemNone, exitBtn: w.exitBtn, exitDone: w.exitDone, solo: t.home.solo, pin: t.home.pin, penaltyLabel: w.penaltyLabel, refundLabel: w.refundLabel, redeemConfirm: w.redeemConfirm, redeemCancel: w.redeemCancel, redeemWarn: w.redeemWarn }}
      />

      <WithdrawForm max={max} feeFree={feeFree} defaultAddress={user.depositAddress ?? ""} t={w} />

      <section className="mt-5">
        <h2 className="font-serif text-[1.05rem] font-bold">{w.records}</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-[0.78rem]" style={{ color: "#8c8c8c" }}>{w.noRecords}</p>
        ) : (
          <div className="mt-2 space-y-2.5">
            {rows.map((row) => (
              <div key={row.id} className="paper px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-num text-[1.05rem] font-semibold">{fmtU(Number(row.amount))} U</div>
                    <div className="font-num text-[0.66rem]" style={{ color: "#8c8c8c" }}>{t.common.orderNo} {withdrawOrderNo(row)}</div>
                    <div className="text-[0.68rem]" style={{ color: "#757575" }}>
                      {fmtVN(row.submittedAt.toISOString(), true)}
                      {Number(row.fee) > 0 && ` · ${w.fee} ${fmtU(Number(row.fee))}`}
                      {row.txHash && ` · tx ${row.txHash.slice(0, 8)}…`}
                    </div>
                  </div>
                  <Seal tone={statusTone[row.status] ?? "ink"}>{statusLabel[row.status] ?? row.status}</Seal>
                </div>
                {row.status === "pending" && <WithdrawActions id={row.id} />}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-5 text-center text-[0.64rem]" style={{ color: "#8c8c8c" }}>{tpl(w.regDaysNote, { n: daysSince(user.registeredAt.toISOString()) })}</p>
    </div>
  );
}

function Cell({ label, value, mid, tip, tipAlign }: { label: string; value: string; mid?: boolean; tip?: string; tipAlign?: "center" | "right" }) {
  return (
    <div className={`text-center ${mid ? "border-x" : ""}`} style={mid ? { borderColor: "#e6e6ea" } : undefined}>
      <div className="font-num text-[1.02rem] font-semibold">{value}</div>
      <div className="flex items-center justify-center gap-1 text-[0.64rem]" style={{ color: "#757575" }}>
        {label}
        {tip && <InfoDot text={tip} align={tipAlign ?? "center"} />}
      </div>
    </div>
  );
}
