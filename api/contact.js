function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toTrimmed(value) {
  return String(value ?? "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const fullName = toTrimmed(body.name);
    const email = toTrimmed(body.email);
    const phone = toTrimmed(body.phone);
    const subject = toTrimmed(body.subject) || "New contact enquiry from website";
    const message = toTrimmed(body.message);

    if (!fullName || !email || !message) {
      return res.status(400).json({ ok: false, error: "Name, email, and message are required." });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL || "talktoraretifiedrealty@gmail.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "RaretifiedRealty <onboarding@resend.dev>";

    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Missing RESEND_API_KEY." });
    }

    const text = [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone || "-"}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
    ].join("\n");

    const html = `
      <div style="margin:0;padding:24px;background:#f5f3ff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e9dfff;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(135deg,#3e0091,#5a1bb3);">
              <p style="margin:0;color:#dccdff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">RaretifiedRealty</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;line-height:1.3;">New Contact Enquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 10px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;width:140px;color:#6b7280;font-size:13px;font-weight:600;">Full name</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;font-size:14px;">${escapeHtml(fullName)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;width:140px;color:#6b7280;font-size:13px;font-weight:600;">Email</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;font-size:14px;">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;width:140px;color:#6b7280;font-size:13px;font-weight:600;">Phone</td>
                  <td style="padding:10px 0;border-bottom:1px solid #f1e8ff;font-size:14px;">${escapeHtml(phone || "-")}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;width:140px;color:#6b7280;font-size:13px;font-weight:600;">Subject</td>
                  <td style="padding:10px 0;font-size:14px;">${escapeHtml(subject)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Message</p>
              <div style="background:#faf7ff;border:1px solid #eadfff;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(message)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;background:#fcfbff;border-top:1px solid #f1e8ff;">
              <p style="margin:0;color:#7c3aed;font-size:12px;">Submitted from website contact form</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        reply_to: email,
        text,
        html,
      }),
    });

    const resendBody = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: resendBody?.message || "Failed to send email via Resend.",
      });
    }

    return res.status(200).json({ ok: true, id: resendBody?.id || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return res.status(500).json({ ok: false, error: message });
  }
}
