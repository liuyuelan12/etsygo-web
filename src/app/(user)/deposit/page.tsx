import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session-user";
import { prisma } from "@/lib/db";
import { fmtU, fmtVN, depositOrderNo } from "@/lib/format";
import { getDict, tpl } from "@/lib/i18n-server";
import { RECEIVE_ADDRESS } from "@/lib/chain";
import DepositActions from "@/components/user/DepositActions";
import WalletDeposit from "@/components/user/WalletDeposit";

export default async function DepositPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t } = await getDict();
  const d = t.deposit;
  const available = Number(user.balance?.available ?? 0);

  const deposits = await prisma.ledgerEntry.findMany({
    where: { userId: user.id, type: "deposit" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="px-4 pb-6">
      <header className="flex items-center gap-2 pt-3 pb-2">
        <Link href="/" style={{ color: "#757575" }}>←</Link>
        <div>
          <div className="eyebrow">{t.home.deposit}</div>
          <h1 className="font-serif text-[1.4rem] font-bold">{d.title}</h1>
        </div>
      </header>

      <section className="tag mt-2 px-5 pb-5 pt-7">
        <span className="eyebrow">{d.available}</span>
        <div className="font-num mt-1 text-[2.4rem] leading-none">{fmtU(available)}</div>
      </section>

      <section className="paper mt-3 px-4 py-4">
        <div className="text-[0.78rem] font-semibold">{d.addrTitle}</div>
        <div className="mt-1.5 break-all rounded-xl px-3 py-2.5 font-num text-[0.82rem]" style={{ background: "#f5f5f7", boxShadow: "inset 0 0 0 1px #dcdce1", color: "#222222" }}>
          {RECEIVE_ADDRESS}
        </div>
        <p className="mt-2 text-[0.68rem]" style={{ color: "#8c8c8c" }}>
          {tpl(d.addrHint, { c: (process.env.USDT_ADDRESS ?? "0x55d398326f99059ff775485246999027b3197955").slice(0, 6) })}
        </p>
        <div className="mt-3">
          <DepositActions address={RECEIVE_ADDRESS} t={d} />
        </div>
      </section>

      <section className="paper mt-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>👛</span>
          <span className="text-[0.82rem] font-semibold">{d.walletTitle}</span>
        </div>
        <p className="mt-1 mb-3 text-[0.68rem]" style={{ color: "#8c8c8c" }}>{d.walletHint}</p>
        <WalletDeposit depositAddress={RECEIVE_ADDRESS} t={d} />
      </section>

      <section className="mt-5">
        <h2 className="font-serif text-[1.05rem] font-bold">{d.records}</h2>
        {deposits.length === 0 ? (
          <p className="mt-2 text-[0.78rem]" style={{ color: "#8c8c8c" }}>{d.noRecords}</p>
        ) : (
          <div className="paper mt-2 px-4 py-1">
            {deposits.map((row, i) => (
              <div key={row.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < deposits.length - 1 ? "1px solid #e6e6ea" : "none" }}>
                <div>
                  <div className="font-num text-[0.7rem]" style={{ color: "#8c8c8c" }}>{t.common.orderNo} {depositOrderNo(row)}</div>
                  <div className="text-[0.72rem]" style={{ color: "#757575" }}>{fmtVN(row.createdAt.toISOString(), true)}</div>
                </div>
                <span className="font-num text-[0.92rem] font-semibold" style={{ color: "#c14600" }}>+{fmtU(Number(row.amount))} U</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
