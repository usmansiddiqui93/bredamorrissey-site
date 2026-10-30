#!/usr/bin/env node
// Local preview of the full site + CMS, behaving like Vercel.
// Usage:  ADMIN_PASSWORD=choose-one node _source/dev-server.js   then open http://localhost:3000 (admin: /admin)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const SITE = path.join(__dirname, "..", "site");
const UPLOADS = path.join(__dirname, "..", ".data", "uploads");
const PORT = Number(process.env.PORT || 3000);
const cfg = JSON.parse(fs.readFileSync(path.join(SITE, "vercel.json"), "utf8"));
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".json": "application/json",
  ".xml": "application/xml", ".txt": "text/plain" };

function match(pattern, pathname) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
  const m = pathname.match(re);
  if (!m) return null;
  const params = {}; keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
  return params;
}
function staticFile(pathname) {
  if (pathname.includes("..")) return null;
  const tries = pathname.endsWith("/") ? [pathname + "index.html"] : [pathname, pathname + ".html", pathname + "/index.html"];
  for (const t of tries) {
    const f = path.join(SITE, t);
    if (f.startsWith(SITE) && fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
function sendFile(res, f, status = 200) {
  res.writeHead(status, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}
async function runApi(name, req, res, query) {
  const file = path.join(SITE, "api", name + ".js");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
  delete require.cache[require.resolve(file)];
  const fn = require(file);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  req.query = query;
  if (raw) { try { req.body = JSON.parse(raw); } catch { req.body = raw; } }
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
  res.send = (b) => res.end(b);
  await fn(req, res);
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`);
    let p = decodeURIComponent(u.pathname);
    const query = Object.fromEntries(u.searchParams);
    for (const r of cfg.redirects || []) {
      if (match(r.source, p)) { res.writeHead(r.statusCode || 308, { Location: r.destination }); return res.end(); }
    }
    if (p.endsWith(".html") && p !== "/404.html") { res.writeHead(308, { Location: p.replace(/(index)?\.html$/, "") || "/" }); return res.end(); }
    if (p.startsWith("/api/")) return runApi(p.slice(5).replace(/\/$/, ""), req, res, query);
    if (p.startsWith("/uploads/")) {
      const f = path.join(UPLOADS, path.basename(p));
      if (fs.existsSync(f)) return sendFile(res, f);
    }
    const f = staticFile(p);
    if (f) return sendFile(res, f);
    for (const r of cfg.rewrites || []) {
      const params = match(r.source, p);
      if (!params) continue;
      const dest = new URL(r.destination.replace(/:([a-zA-Z]+)/g, (_, k) => encodeURIComponent(params[k] || "")), "http://x");
      return runApi(dest.pathname.slice(5), req, res, { ...query, ...Object.fromEntries(dest.searchParams) });
    }
    sendFile(res, path.join(SITE, "404.html"), 404);
  } catch (e) {
    console.error(e); res.writeHead(500); res.end("Server error");
  }
}).listen(PORT, () => console.log(`Site: http://localhost:${PORT}   Admin: http://localhost:${PORT}/admin   (password: ${process.env.ADMIN_PASSWORD})`));
