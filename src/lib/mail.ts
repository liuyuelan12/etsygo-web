type SendVerificationArgs = {
  to: string;
  code: string;
};

export async function sendVerificationCode({ to, code }: SendVerificationArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "EtsyGo <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("邮件服务未配置：请设置 RESEND_API_KEY");
  }

  // 加超时：生产 egress 异常时不让 fetch 无限挂起（否则整个注册请求超时 → 502）
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: "EtsyGo 验证码",
        text: `你的 EtsyGo 验证码是 ${code}，15 分钟内有效。若非本人操作，请忽略本邮件。`,
        html: `<p>你的 EtsyGo 验证码是 <strong>${code}</strong>，15 分钟内有效。</p><p>若非本人操作，请忽略本邮件。</p>`,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error((e as Error).name === "AbortError" ? "邮件服务超时，请稍后重试" : `验证码邮件发送失败：${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`验证码邮件发送失败：${body || res.statusText}`);
  }
}
