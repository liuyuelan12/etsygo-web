type Purpose = "register" | "reset";
type SendVerificationArgs = {
  to: string;
  code: string;
  purpose?: Purpose;
};

const COPY: Record<Purpose, { eyebrow: string; guide: string; subject: (c: string) => string }> = {
  register: { eyebrow: "验证码 · Verification", guide: "用下面的验证码，开你的 EtsyGo 小铺", subject: (c) => `你的 EtsyGo 验证码：${c}` },
  reset: { eyebrow: "重置密码 · Reset", guide: "用下面的验证码，重置你的 EtsyGo 登录密码", subject: (c) => `EtsyGo 密码重置验证码：${c}` },
};

// EtsyGo 品牌验证码邮件：把验证码呈现在一张"手作纸吊牌"上（虚线缝边 + 打孔 + 赤陶盖印）。
// 纯表格 + 内联样式，兼容 Gmail/Outlook/Apple Mail，图片关闭也完整可读。
function verifyEmailHtml(code: string, eyebrow: string, guide: string): string {
  return `<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">你的 EtsyGo 验证码 ${code}，15 分钟内有效。</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe9dd;margin:0;padding:0;width:100%;">
  <tr>
    <td align="center" style="padding:32px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #eae3d5;border-radius:18px;overflow:hidden;">
        <!-- 店招 -->
        <tr>
          <td align="center" style="padding:36px 32px 6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="48" height="48" align="center" valign="middle" style="background:#f1641e;border-radius:13px;color:#ffffff;font-family:Georgia,'Songti SC',serif;font-size:27px;font-weight:700;line-height:48px;">E</td>
            </tr></table>
            <div style="margin-top:13px;font-family:Georgia,'Songti SC','Noto Serif SC',serif;font-size:22px;font-weight:700;color:#2e2740;letter-spacing:0.5px;">EtsyGo</div>
            <div style="margin-top:4px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:10.5px;letter-spacing:2.5px;color:#b7a98f;text-transform:uppercase;">Handmade · Neighborhood Shops</div>
          </td>
        </tr>
        <!-- 缝线分隔 -->
        <tr><td style="padding:22px 34px 0;"><div style="border-top:1px dashed #e0d6c4;font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <!-- 正文引导 -->
        <tr>
          <td style="padding:20px 34px 2px;">
            <div style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:11px;letter-spacing:3px;color:#f1641e;font-weight:700;text-transform:uppercase;">${eyebrow}</div>
            <div style="margin-top:11px;font-family:Georgia,'Songti SC','Noto Serif SC',serif;font-size:19px;color:#2e2740;line-height:1.5;">${guide}</div>
          </td>
        </tr>
        <!-- 手作吊牌（签名元素） -->
        <tr>
          <td align="center" style="padding:20px 34px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:340px;">
              <tr>
                <td align="center" style="background:#fdeee6;border:2px dashed #f0b591;border-radius:16px;padding:22px 16px 24px;">
                  <div style="width:14px;height:14px;border-radius:50%;background:#ffffff;border:1px solid #eeccb5;margin:0 auto 12px;font-size:0;line-height:0;">&nbsp;</div>
                  <div style="font-family:Georgia,'Fraunces',serif;font-size:40px;font-weight:700;letter-spacing:8px;color:#d94f12;padding-left:8px;">${code}</div>
                  <div style="margin-top:9px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:12px;color:#b07a5a;letter-spacing:1px;">有效期 15 分钟</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- 安全说明 -->
        <tr>
          <td style="padding:16px 34px 30px;">
            <div style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:12.5px;color:#94897a;line-height:1.65;">不是你本人在注册？忽略这封邮件即可，你的账户很安全。</div>
          </td>
        </tr>
        <!-- 页脚 -->
        <tr>
          <td align="center" style="background:#2e2740;padding:18px 32px;">
            <div style="font-family:Georgia,'Songti SC','Noto Serif SC',serif;font-size:13px;color:#f3f1f8;letter-spacing:0.5px;">EtsyGo 工坊</div>
            <div style="margin-top:4px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;font-size:10.5px;color:#8a83a0;letter-spacing:0.3px;">系统邮件 · 请勿直接回复 · etsygo.com</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export async function sendVerificationCode({ to, code, purpose = "register" }: SendVerificationArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "EtsyGo <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("邮件服务未配置：请设置 RESEND_API_KEY");
  }
  const copy = COPY[purpose];

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
        subject: copy.subject(code),
        text: `你的 EtsyGo 验证码是 ${code}，15 分钟内有效。\n若非本人操作，忽略这封邮件即可。\n\n— EtsyGo 工坊 · etsygo.com`,
        html: verifyEmailHtml(code, copy.eyebrow, copy.guide),
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
