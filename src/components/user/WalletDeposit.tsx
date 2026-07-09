"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { useRouter } from "next/navigation";
import { USDT_ADDRESS } from "@/lib/wagmi";
import { tpl, type Dict } from "@/lib/i18n";

const erc20Abi = [
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

// 用连接的钱包直接充值：转 USDT 到平台充值地址 → 后端按确认数同步到账。
export default function WalletDeposit({ depositAddress, t }: { depositAddress: string; t: Dict["deposit"] }) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState<"send" | null>(null);
  const [msg, setMsg] = useState("");

  if (!isConnected) {
    return <p className="text-center text-[0.74rem]" style={{ color: "#8c8c8c" }}>{t.walletConnectFirst}</p>;
  }

  async function send() {
    setBusy("send");
    setMsg("");
    try {
      await writeContractAsync({ address: USDT_ADDRESS, abi: erc20Abi, functionName: "transfer", args: [depositAddress as `0x${string}`, parseUnits(amount || "0", 18)] });
      setMsg(t.walletConfirming);
      await new Promise((r) => setTimeout(r, 12000));
      await fetch("/api/deposit/sync", { method: "POST" });
      router.refresh();
      setMsg(tpl(t.walletDone, { amount }));
    } catch (e) {
      setMsg("⚠️ " + (e as Error).message.slice(0, 70));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="font-num w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "#fff", boxShadow: "inset 0 0 0 1.5px #dcdce1" }} placeholder={t.walletAmountPh} />
        <button onClick={send} disabled={busy !== null} className="btn btn-primary shrink-0 px-4">
          {busy === "send" ? t.walletDepositing : t.walletDeposit}
        </button>
      </div>
      {msg && <p className="text-center text-[0.74rem]" style={{ color: "#595959" }}>{msg}</p>}
    </div>
  );
}
