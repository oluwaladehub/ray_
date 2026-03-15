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
    const toEmail = process.env.CONTACT_TO_EMAIL || "talktoraretified@gmail.com";
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
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin: 0 0 12px;">New Contact Enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "-")}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
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

