// Data storage for the CMS.
// Production: Upstash Redis (add it in Vercel > Storage; env vars are injected automatically).
// Local / not yet connected: a JSON file (in /tmp on Vercel, so data is NOT kept between deploys).
const fs = require("fs");
const path = require("path");
const seed = require("./seed.json");

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PREFIX = "bm:";
const connected = Boolean(URL_ && TOKEN);

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`Storage error ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const FILE = process.env.CMS_DATA_FILE ||
  (process.env.VERCEL ? "/tmp/bm-cms.json" : path.join(__dirname, "..", "..", "..", ".data", "db.json"));
function readFile() {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; }
}
function writeFile(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 1));
}

async function get(key) {
  if (connected) {
    const v = await redis(["GET", PREFIX + key]);
    return v == null ? null : JSON.parse(v);
  }
  const db = readFile();
  return db[key] === undefined ? null : db[key];
}
async function set(key, value) {
  if (connected) return redis(["SET", PREFIX + key, JSON.stringify(value)]);
  const db = readFile(); db[key] = value; writeFile(db);
}
async function incr(key, ttlSeconds) {
  if (connected) {
    const n = await redis(["INCR", PREFIX + key]);
    if (n === 1 && ttlSeconds) await redis(["EXPIRE", PREFIX + key, String(ttlSeconds)]);
    return n;
  }
  const db = readFile(); const rec = db[key];
  const now = Date.now();
  const cur = rec && rec.exp > now ? rec : { n: 0, exp: now + (ttlSeconds || 3600) * 1000 };
  cur.n += 1; db[key] = cur; writeFile(db);
  return cur.n;
}

// Collections (seeded with the existing blog posts on first use)
async function list(name) {
  let v = await get(name);
  if (v == null) {
    v = seed[name] ? JSON.parse(JSON.stringify(seed[name])) : [];
    await set(name, v);
  }
  return v;
}
async function save(name, items) { return set(name, items); }

module.exports = { get, set, incr, list, save, connected };
