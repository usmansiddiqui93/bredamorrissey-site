// Writes static preview copies of the CMS blog (blog index + every published post) for GitHub Pages.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const lib = path.join(root, "site", "api", "_lib");
delete require.cache[require.resolve(path.join(lib, "shell.js"))];
const R = require(path.join(lib, "render.js"));
const seed = require(path.join(lib, "seed.json"));
const map = { "/": "index.html", "/cbt-for-anxiety": "cbt-for-anxiety.html", "/cbt-for-stress": "cbt-for-stress.html",
  "/services": "services.html", "/faq": "faq.html", "/blog": "blog.html", "/contact": "contact.html" };
const toPreview = (html) => html
  .replace(/href="(\/[^"#]*)"/g, (m, u) => map[u] ? `href="${map[u]}"` : u.startsWith("/blog/") ? `href="${u.slice(6)}.html"` : m)
  .replace(/(src|href)="\/(images|assets)\//g, '$1="../site/$2/');
const out = path.join(root, "preview");
fs.writeFileSync(path.join(out, "blog.html"), toPreview(R.blogIndex(seed.posts)));
for (const p of seed.posts.filter((x) => x.status === "published")) {
  fs.writeFileSync(path.join(out, `${p.slug}.html`), toPreview(R.postPage(p, seed.posts)));
}
console.log("Preview blog written:", seed.posts.filter((x) => x.status === "published").length, "posts");
