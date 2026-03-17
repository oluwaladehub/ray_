function toTrimmed(value) {
  return String(value ?? "").trim();
}

function digitsOnly(value) {
  return toTrimmed(value).replace(/[^\d]/g, "");
}

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;
const requestWindow = new Map();

function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return String(forwarded[0] || "").trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(key) {
  const now = Date.now();
  const hit = requestWindow.get(key);
  if (!hit || now - hit.startedAt > WINDOW_MS) {
    requestWindow.set(key, { startedAt: now, count: 1 });
    return false;
  }

  hit.count += 1;
  requestWindow.set(key, hit);
  return hit.count > MAX_REQUESTS;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const clientKey = getClientKey(req);
    if (isRateLimited(clientKey)) {
      return res.status(429).json({ ok: false, error: "Too many requests. Please try again shortly." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const fullName = toTrimmed(body.fullName);
    const phone = toTrimmed(body.phone);
    const message = toTrimmed(body.message);

    if (!fullName || !phone || !message) {
      return res.status(400).json({ ok: false, error: "fullName, phone, and message are required." });
    }

    if (message.length > 1200) {
      return res.status(400).json({ ok: false, error: "Message is too long." });
    }

    const number = digitsOnly(process.env.WHATSAPP_NUMBER || "2349058886789");
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    return res.status(200).json({
      ok: true,
      whatsappUrl,
      trackingAccepted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return res.status(500).json({ ok: false, error: message });
  }
}
