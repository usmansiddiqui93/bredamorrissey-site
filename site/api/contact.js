// Contact form endpoint: stores enquiries for the admin inbox and (optionally) emails a notification.
const crypto = require("crypto");
const store = require("./_lib/store");

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  return {};
}
const clean = (v, n) => String(v || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);

async function notify(entry) {
  const key = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const from = process.env.NOTIFY_FROM || "Website <onboarding@resend.dev>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [to], reply_to: entry.email,
      subject: `New website enquiry from ${entry.name}`,
      text: `Name: ${entry.name}\nEmail: ${entry.email}\nPhone: ${entry.phone || "-"}\n\n${entry.message}\n\nView all enquiries: https://www.bredamorrissey.com/admin`,
    }),
  }).catch(() => {});
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ ok: false })); }
  const send = (code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  try {
    const b = await readBody(req);
    if (b._gotcha) return send(200, { ok: true }); // bot honeypot
    const entry = {
      id: crypto.randomBytes(8).toString("hex"),
      name: clean(b.name, 120), email: clean(b.email, 160), phone: clean(b.phone, 40), message: clean(b.message, 5000),
      page: clean(b.page, 200), created: new Date().toISOString(), read: false,
    };
    if (!entry.name || !/^\S+@\S+\.\S+$/.test(entry.email) || !entry.message) {
      return send(400, { ok: false, error: "Please fill in your name, a valid email address and your message." });
    }
    const ip = (req.headers["x-forwarded-for"] || "local").split(",")[0].trim();
    if ((await store.incr(`contact:${ip}`, 3600)) > 6) return send(429, { ok: false, error: "Too many messages. Please call or email instead." });
    const subs = (await store.get("submissions")) || [];
    subs.unshift(entry);
    await store.set("submissions", subs.slice(0, 1000));
    await notify(entry);
    return send(200, { ok: true });
  } catch (e) {
    console.error(e);
    return send(500, { ok: false, error: "Your message could not be sent. Please email or call instead." });
  }
};
