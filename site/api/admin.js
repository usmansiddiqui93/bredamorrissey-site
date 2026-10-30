// Admin API for the CMS. All actions except login/me require a valid session.
const crypto = require("crypto");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const media = require("./_lib/media");

const RESERVED = new Set(["", "blog", "admin", "api", "assets", "images", "uploads", "cbt-for-anxiety", "cbt-for-stress",
  "services", "faq", "contact", "index", "404", "sitemap", "sitemap.xml", "robots.txt", "empty-page", "home", "anxiety"]);
const slugify = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const str = (v, n = 300) => String(v ?? "").slice(0, n);

function cleanSections(list) {
  return (Array.isArray(list) ? list : []).slice(0, 60).map((s) => {
    const o = { type: str(s.type, 20) };
    ["kicker", "heading", "text", "intro", "buttonLabel", "buttonLink", "image", "imageAlt", "alt", "caption", "author",
     "side", "imageShape", "background", "columns"].forEach((k) => { if (s[k] != null && s[k] !== "") o[k] = str(s[k], 1000); });
    if (s.html != null) o.html = str(s.html, 200000);
    if (s.items != null) o.items = Array.isArray(s.items) ? s.items.map((x) => str(x, 300)).filter(Boolean) : str(s.items, 5000);
    if (Array.isArray(s.faqs)) o.faqs = s.faqs.slice(0, 50).map((f) => ({ q: str(f.q, 300), a: str(f.a, 5000) })).filter((f) => f.q);
    return o;
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const send = (code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  const action = (req.query && req.query.action) || "";
  const method = req.method;
  try {
    if (action === "login" && method === "POST") {
      const b = await readBody(req);
      const r = await auth.login(req, b.password);
      if (!r.ok) return send(401, r);
      auth.setSession(req, res);
      return send(200, { ok: true });
    }
    if (action === "logout") { auth.clearSession(req, res); return send(200, { ok: true }); }
    if (action === "me") {
      return send(200, { authed: auth.isAuthed(req), storage: store.connected, blob: media.hasBlob, vercel: Boolean(process.env.VERCEL), passwordSet: Boolean(process.env.ADMIN_PASSWORD) });
    }
    if (!auth.isAuthed(req)) return send(401, { ok: false, error: "Please log in." });
    if (method === "POST" && req.headers["x-requested-with"] !== "bm-admin") return send(403, { ok: false, error: "Bad request." });

    // ----- posts & pages -----
    if (action === "posts" || action === "pages") {
      const kind = action;
      const items = await store.list(kind);
      if (method === "GET") return send(200, { ok: true, items });
      if (method === "DELETE") {
        const id = req.query.id;
        await store.save(kind, items.filter((x) => x.id !== id));
        return send(200, { ok: true });
      }
      if (method === "POST") {
        const b = await readBody(req);
        const title = str(b.title, 200).trim();
        if (!title) return send(400, { ok: false, error: "Please add a title." });
        const slug = slugify(b.slug || title);
        if (!slug) return send(400, { ok: false, error: "Please add a URL slug." });
        if (kind === "pages" && RESERVED.has(slug)) return send(400, { ok: false, error: `"/${slug}" is already used by the site. Choose a different URL.` });
        const id = b.id || crypto.randomBytes(6).toString("hex");
        if (items.some((x) => x.slug === slug && x.id !== id)) return send(400, { ok: false, error: `Another ${kind === "posts" ? "post" : "page"} already uses "${slug}".` });
        const rec = {
          id, slug, title, status: b.status === "published" ? "published" : "draft",
          metaTitle: str(b.metaTitle, 200), description: str(b.description, 320),
          sections: cleanSections(b.sections), updated: new Date().toISOString(),
        };
        if (kind === "posts") {
          Object.assign(rec, {
            date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : new Date().toISOString().slice(0, 10),
            topic: ["anxiety", "stress", "services"].includes(b.topic) ? b.topic : "services",
            excerpt: str(b.excerpt, 400), cover: str(b.cover, 1000),
          });
        } else {
          rec.noindex = Boolean(b.noindex);
        }
        const i = items.findIndex((x) => x.id === id);
        if (i >= 0) items[i] = { ...items[i], ...rec }; else items.unshift(rec);
        await store.save(kind, items);
        return send(200, { ok: true, item: rec });
      }
    }

    // ----- contact enquiries -----
    if (action === "submissions") {
      const subs = (await store.get("submissions")) || [];
      if (method === "GET") return send(200, { ok: true, items: subs });
      if (method === "POST") {
        const b = await readBody(req);
        const s = subs.find((x) => x.id === b.id);
        if (s) s.read = Boolean(b.read);
        await store.set("submissions", subs);
        return send(200, { ok: true });
      }
      if (method === "DELETE") {
        await store.set("submissions", subs.filter((x) => x.id !== req.query.id));
        return send(200, { ok: true });
      }
    }

    // ----- media -----
    if (action === "upload" && method === "POST") {
      const b = await readBody(req);
      const r = await media.upload(b);
      return send(200, { ok: true, ...r });
    }
    if (action === "media") {
      if (method === "GET") return send(200, { ok: true, items: await media.listMedia() });
      if (method === "DELETE") { await media.removeMedia(req.query.url); return send(200, { ok: true }); }
    }
    return send(404, { ok: false, error: "Unknown action." });
  } catch (e) {
    console.error(e);
    return send(500, { ok: false, error: e.message || "Something went wrong." });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: "4.5mb" } } };
