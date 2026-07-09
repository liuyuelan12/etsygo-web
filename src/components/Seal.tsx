// 状态药丸。tone 决定配色（黑白桔兰系：桔=正向/活跃，兰=中性/待处理，红=风险）。
export type SealTone = "orange" | "plum" | "red" | "ink";

export default function Seal({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: SealTone;
}) {
  return <span className={`seal seal-${tone}`}>{children}</span>;
}

const STATUS_TONE: Record<string, SealTone> = {
  营业中: "orange",
  计息中: "plum",
  已到期: "ink",
  已退出: "ink",
  已冻结: "red",
  正常: "orange",
  冻结: "red",
  审核中: "plum",
  出款中: "plum",
  已到账: "orange",
  已通过: "orange",
  已取消: "ink",
  已驳回: "red",
};

export function StatusSeal({ status }: { status: string }) {
  return <Seal tone={STATUS_TONE[status] ?? "ink"}>{status}</Seal>;
}
