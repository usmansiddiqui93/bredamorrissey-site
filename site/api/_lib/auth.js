// Single-user admin login: password in ADMIN_PASSWORD, signed session cookie.
const crypto = require("crypto");
const store = require("./store");

const SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
const COOKIE = "bm_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((c) => {
    const i = c.indexOf("="); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) { return Boolean(verify(cookies(req)[COOKIE])); }
function secureFlag(req) {
  const proto = req.headers["x-forwarded-proto"] || "";
  return proto === "https" || process.env.VERCEL ? "; Secure" : "";
}
function setSession(req, res) {
  const token = sign({ u: "admin", exp: Date.now() + MAX_AGE * 1000 });
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secureFlag(req)}`);
}
function clearSession(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag(req)}`);
}
async function login(req, password) {
  const ip = (req.headers["x-forwarded-for"] || "local").split(",")[0].trim();
  const tries = await store.incr(`login:${ip}`, 900);
  if (tries > 10) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, error: "ADMIN_PASSWORD is not set in Vercel environment variables." };
  const a = crypto.createHash("sha256").update(String(password || "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, error: "Incorrect password." };
  return { ok: true };
}
module.exports = { isAuthed, setSession, clearSession, login };
