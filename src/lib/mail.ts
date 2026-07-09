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

  const res = await fetch("https://api.resend.com/emails", {
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
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`验证码邮件发送失败：${body || res.statusText}`);
  }
}
