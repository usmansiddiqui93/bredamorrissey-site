// Image uploads. Production: Vercel Blob (add it in Vercel > Storage). Local: .data/uploads.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_DIR = path.join(__dirname, "..", "..", "..", ".data", "uploads");
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

function slugName(name) {
  return String(name || "image").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "image";
}

async function upload({ name, type, data }) {
  const ext = TYPES[type];
  if (!ext) throw new Error("Only JPG, PNG, WebP or GIF images can be uploaded.");
  const buf = Buffer.from(String(data).replace(/^data:[^,]+,/, ""), "base64");
  if (buf.length > 4 * 1024 * 1024) throw new Error("Image is too large (max 4 MB after compression).");
  const file = `${slugName(name)}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
  if (hasBlob) {
    const { put } = require("@vercel/blob");
    const r = await put(`uploads/${file}`, buf, { access: "public", contentType: type, addRandomSuffix: false });
    return { url: r.url, name: file, size: buf.length };
  }
  if (process.env.VERCEL) throw new Error("Image storage is not connected. Add Vercel Blob in the Vercel dashboard (Storage tab).");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, file), buf);
  return { url: `/uploads/${file}`, name: file, size: buf.length };
}

async function listMedia() {
  if (hasBlob) {
    const { list } = require("@vercel/blob");
    const r = await list({ prefix: "uploads/", limit: 500 });
    return r.blobs.map((b) => ({ url: b.url, name: b.pathname.replace("uploads/", ""), size: b.size, uploaded: b.uploadedAt }))
      .sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded)));
  }
  if (!fs.existsSync(LOCAL_DIR)) return [];
  return fs.readdirSync(LOCAL_DIR).map((f) => {
    const st = fs.statSync(path.join(LOCAL_DIR, f));
    return { url: `/uploads/${f}`, name: f, size: st.size, uploaded: st.mtime.toISOString() };
  }).sort((a, b) => b.uploaded.localeCompare(a.uploaded));
}

async function removeMedia(url) {
  if (hasBlob) { const { del } = require("@vercel/blob"); await del(url); return; }
  const f = path.join(LOCAL_DIR, path.basename(url));
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

module.exports = { upload, listMedia, removeMedia, hasBlob };
