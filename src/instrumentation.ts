// Next 服务启动钩子：按开关启动常驻入金扫链。
// 默认关闭（DEPOSIT_POLLER_ENABLED !== "true"）——配好主网 env + 小额测通后再置 true 开启。
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DEPOSIT_POLLER_ENABLED === "true") {
    const { startDepositPoller } = await import("./lib/deposit-poller");
    startDepositPoller();
  }
  if (process.env.SWEEP_ENABLED === "true") {
    const { startSweeper } = await import("./lib/sweep");
    startSweeper();
  }
}
