// Allow-list HTML sanitiser for rich text written in the admin editor.
const ALLOWED = {
  p: ["class"], h2: [], h3: [], h4: [], strong: [], b: [], em: [], i: [], u: [], br: [],
  ul: [], ol: [], li: [], blockquote: [], a: ["href"], figure: [], figcaption: [],
  img: ["src", "alt"], div: ["class"],
};
const CLASSES = new Set(["standfirst", "tip-box", "refs"]);

function escAttr(v) { return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function safeUrl(u, img) {
  u = String(u || "").trim();
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("/") || u.startsWith("#")) return u;
  if (!img && /^(mailto:|tel:)/i.test(u)) return u;
  return null;
}

function sanitize(html) {
  if (!html) return "";
  let s = String(html)
    .replace(/<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tagRaw, attrs) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED[tag]) return "";
    if (m.startsWith("</")) return tag === "br" || tag === "img" ? "" : `</${tag}>`;
    if (tag === "b") return "<strong>";
    if (tag === "i") return "<em>";
    const out = [];
    const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let a;
    while ((a = re.exec(attrs))) {
      const name = a[1].toLowerCase();
      const val = a[3] ?? a[4] ?? a[5] ?? "";
      if (!ALLOWED[tag].includes(name)) continue;
      if (name === "href") { const u = safeUrl(val, false); if (u) out.push(`href="${escAttr(u)}"`); }
      else if (name === "src") { const u = safeUrl(val, true); if (u) out.push(`src="${escAttr(u)}"`); }
      else if (name === "class") { const c = val.split(/\s+/).filter((x) => CLASSES.has(x)); if (c.length) out.push(`class="${c.join(" ")}"`); }
      else out.push(`${name}="${escAttr(val)}"`);
    }
    if (tag === "a") {
      const href = out.find((x) => x.startsWith("href="));
      if (href && /https?:\/\//.test(href) && !/bredamorrissey\.com/.test(href)) out.push('target="_blank" rel="noopener"');
    }
    if (tag === "img") { out.push('loading="lazy"'); if (!out.some((x) => x.startsWith("src="))) return ""; }
    return `<${tag}${out.length ? " " + out.join(" ") : ""}>`;
  });
  return s;
}
module.exports = { sanitize };
