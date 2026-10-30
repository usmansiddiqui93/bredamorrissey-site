// Server-side rendering for CMS content: blog index, blog posts, custom pages and the sitemap.
const shell = require("./shell");
const { sanitize } = require("./sanitize");

const DOMAIN = "https://www.bredamorrissey.com";
const TOPIC = { anxiety: "Anxiety & overthinking", stress: "Stress & burnout", services: "Wellbeing" };
const TOPIC_LINK = { anxiety: "/cbt-for-anxiety", stress: "/cbt-for-stress", services: "/services" };
const REL_COPY = {
  anxiety: ["Struggling with anxiety or overthinking?", "Online CBT can help you understand anxious thoughts, break the cycle of worry and feel more in control.", "Online CBT for anxiety"],
  stress: ["Feeling stressed, overwhelmed or close to burnout?", "Online CBT gives you practical tools to manage stress, reduce worry and protect your wellbeing.", "Online CBT for stress"],
  services: ["Looking for support?", "Explore CBT, counselling and mindfulness-based therapy, all available online across Ireland.", "View my services"],
};
const RIPPLE = '<svg class="ripple" viewBox="0 0 1000 1000" aria-hidden="true"><circle cx="500" cy="500" r="120"/><circle cx="500" cy="500" r="220"/><circle cx="500" cy="500" r="320"/><circle cx="500" cy="500" r="420"/></svg>';
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATIC_PAGES = ["/", "/cbt-for-anxiety", "/cbt-for-stress", "/services", "/faq", "/contact", "/blog"];

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u) => (!u ? `${DOMAIN}/images/breda-morrissey-counsellor.jpg` : u.startsWith("/") ? DOMAIN + u : u);
function fmtDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : "";
}
function toItems(v) { return Array.isArray(v) ? v.filter(Boolean) : String(v || "").split("\n").map((x) => x.trim()).filter(Boolean); }
function plain(sections) {
  return (sections || []).map((s) => [s.heading, s.text, s.intro, s.html, s.caption, toItems(s.items).join(" "),
    (s.faqs || []).map((f) => `${f.q} ${f.a}`).join(" ")].filter(Boolean).join(" ")).join(" ").replace(/<[^>]+>/g, " ");
}
function readingTime(p) { return Math.max(2, Math.round(plain(p.sections).split(/\s+/).filter(Boolean).length / 220)); }
function btn(label, link, cls = "btn-primary") {
  return label && link ? `<a class="btn ${cls}" href="${esc(link)}">${esc(label)}</a>` : "";
}
function crumbs(trail) {
  return `<p class="crumb">${trail.map(([l, u]) => (u ? `<a href="${esc(u)}">${esc(l)}</a>` : esc(l))).join(" / ")}</p>`;
}
function ld(obj) { return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`; }
function breadcrumb(trail) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: trail.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: DOMAIN + u })) };
}
function fill(tpl, v) {
  return tpl.replace(/%%TITLE%%/g, esc(v.title)).replace(/%%DESC%%/g, esc(v.desc)).replace(/%%CANON%%/g, esc(v.canon))
    .replace("%%ROBOTS%%", v.noindex ? '<meta name="robots" content="noindex">' : "")
    .replace("%%OGIMG%%", esc(abs(v.ogImage))).replace("%%OGTYPE%%", v.ogType || "website")
    .replace("%%SCHEMA%%", (v.schema || []).map(ld).join("")).replace("%%BODY%%", () => v.body);
}

/* ---------- sections ---------- */
function faqHtml(faqs) {
  return `<div class="faq">${(faqs || []).filter((f) => f.q).map((f, i) =>
    `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><div class="answer">${sanitize(f.a ? (f.a.includes("<") ? f.a : `<p>${esc(f.a)}</p>`) : "")}</div></details>`).join("")}</div>`;
}
function ticks(items, cols) {
  return `<ul class="ticks${cols === 2 || cols === "2" ? " cols" : ""}">${toItems(items).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}
function img(src, alt, cls = "media") {
  return src ? `<div class="${cls}"><img src="${esc(src)}" alt="${esc(alt || "")}" loading="lazy"></div>` : "";
}

// Sections inside a blog article (narrow column)
function articleSection(s) {
  switch (s.type) {
    case "text": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${sanitize(s.html)}`;
    case "imageText": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${s.image ? `<figure><img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" loading="lazy"></figure>` : ""}${sanitize(s.html)}`;
    case "image": return s.image ? `<figure><img src="${esc(s.image)}" alt="${esc(s.alt)}" loading="lazy">${s.caption ? `<figcaption class="muted" style="font-size:.9rem;margin-top:.6em">${esc(s.caption)}</figcaption>` : ""}</figure>` : "";
    case "checklist": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${s.intro ? `<p>${esc(s.intro)}</p>` : ""}${ticks(s.items, s.columns)}`;
    case "quote": return `<blockquote>${esc(s.text)}${s.author ? `<br><span class="muted" style="font-size:.9rem">${esc(s.author)}</span>` : ""}</blockquote>`;
    case "faq": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${faqHtml(s.faqs)}`;
    case "cta": return `<div class="tip-box"><h3 style="margin-top:0">${esc(s.heading)}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ""}<div class="btn-row" style="margin-top:.6em">${btn(s.buttonLabel, s.buttonLink)}</div></div>`;
    default: return "";
  }
}

// Sections on a full-width page
function pageSection(s, page, i) {
  const bg = { blush: "surface-blush", soft: "surface-soft", dark: "surface-dark" }[s.background] || "";
  const head = (k) => `${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ""}${s.heading ? `<${k}>${esc(s.heading)}</${k}>` : ""}`;
  switch (s.type) {
    case "hero":
      return `<section class="page-hero">${RIPPLE}<div class="wrap${s.image ? " hero-split" : ""}"><div>
${crumbs([["Home", "/"], [page.title]])}${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ""}<h1>${esc(s.heading || page.title)}</h1>
${s.text ? `<p class="lead">${esc(s.text)}</p>` : ""}${s.buttonLabel ? `<div class="btn-row">${btn(s.buttonLabel, s.buttonLink)}</div>` : ""}</div>
${s.image ? img(s.image, s.imageAlt, "media arch") : ""}</div></section>`;
    case "text":
      return `<section class="${bg}"><div class="wrap">${s.heading ? `<div class="split top"><div>${head("h2")}</div><div class="measure">${sanitize(s.html)}</div></div>` : `<div class="measure" style="margin:0 auto">${sanitize(s.html)}</div>`}</div></section>`;
    case "imageText": {
      const media = img(s.image, s.imageAlt, s.imageShape === "arch" ? "media arch" : "media");
      const text = `<div>${head("h2")}${sanitize(s.html)}${s.buttonLabel ? `<div class="btn-row">${btn(s.buttonLabel, s.buttonLink)}</div>` : ""}</div>`;
      return `<section class="${bg}"><div class="wrap split">${s.side === "left" ? media + text : text + media}</div></section>`;
    }
    case "checklist":
      return `<section class="${bg}"><div class="wrap"><div class="section-head">${head("h2")}${s.intro ? `<p class="lead">${esc(s.intro)}</p>` : ""}</div><div class="card">${ticks(s.items, s.columns)}</div></div></section>`;
    case "quote":
      return `<section class="${bg || "surface-blush"}"><div class="wrap" style="display:flex;justify-content:center"><div><p class="statement">${esc(s.text)}</p>${s.author ? `<p class="muted">${esc(s.author)}</p>` : ""}</div></div></section>`;
    case "faq":
      return `<section class="${bg}"><div class="wrap split top"><div>${head("h2")}</div>${faqHtml(s.faqs)}</div></section>`;
    case "image":
      return s.image ? `<section class="${bg}" style="padding-top:clamp(24px,4vw,48px);padding-bottom:clamp(24px,4vw,48px)"><div class="wrap"><figure style="margin:0"><div class="banner-img" style="margin:0"><img src="${esc(s.image)}" alt="${esc(s.alt)}" loading="lazy"></div>${s.caption ? `<figcaption class="muted center" style="margin-top:12px;font-size:.92rem">${esc(s.caption)}</figcaption>` : ""}</figure></div></section>` : "";
    case "cta":
      return `<section class="surface-dark cta-band">${RIPPLE}<div class="wrap"><div><h2>${esc(s.heading)}</h2>${s.text ? `<p>${esc(s.text)}</p>` : ""}</div><div class="btn-row" style="margin-top:0">${btn(s.buttonLabel || "Book a consultation", s.buttonLink || "/contact")}<a class="btn btn-ghost" href="tel:+353838541298">083 854 1298</a></div></div></section>`;
    default: return "";
  }
}

/* ---------- blog ---------- */
function postCard(p) {
  return `<a class="post-card" href="/blog/${esc(p.slug)}" data-topic="${esc(p.topic)}">
  <div class="thumb">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy" width="600" height="400">` : ""}</div>
  <div class="body"><p class="post-meta"><span class="tag">${esc(TOPIC[p.topic] || "Wellbeing")}</span><span>${fmtDate(p.date)}</span><span>${readingTime(p)} min read</span></p>
  <h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><span class="go">Read article</span></div></a>`;
}
function sortPosts(posts) { return [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date))); }

function blogIndex(posts) {
  const live = sortPosts(posts.filter((p) => p.status === "published"));
  const [first, ...rest] = live;
  const filters = `<button type="button" data-filter="all" aria-pressed="true">All articles</button>` +
    Object.entries(TOPIC).map(([k, v]) => `<button type="button" data-filter="${k}" aria-pressed="false">${esc(v)}</button>`).join("");
  const feature = first ? `<a class="post-feature" href="/blog/${esc(first.slug)}">
      <div class="img">${first.cover ? `<img src="${esc(first.cover)}" alt="">` : ""}</div>
      <div class="txt"><p class="post-meta"><span class="tag">Latest · ${esc(TOPIC[first.topic] || "Wellbeing")}</span><span>${fmtDate(first.date)}</span><span>${readingTime(first)} min read</span></p>
      <h2>${esc(first.title)}</h2><p>${esc(first.excerpt)}</p><span class="go">Read the article</span></div></a>` : "<p>No articles yet.</p>";
  const body = `<section class="page-hero">${RIPPLE}<div class="wrap">${crumbs([["Home", "/"], ["Blog"]])}
<p class="kicker">The blog</p><h1>Tips for stress, anxiety &amp; your wellbeing</h1>
<p class="lead">Practical CBT insights and gentle ideas to help you feel calmer and more in control, written by Breda Morrissey.</p></div></section>
<section style="padding-top:clamp(40px,5vw,64px)"><div class="wrap">${feature}
<div class="filters" role="group" aria-label="Filter articles by topic">${filters}</div>
<div class="posts" id="post-grid">${rest.map(postCard).join("")}</div></div></section>
<script>document.querySelectorAll('.filters button').forEach(function(b){b.addEventListener('click',function(){var f=b.dataset.filter;document.querySelectorAll('.filters button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});document.querySelectorAll('#post-grid .post-card').forEach(function(c){c.hidden=!(f==='all'||c.dataset.topic===f)})})});</script>`;
  return fill(shell.blog, {
    title: "Blog | Tips to Help Stress, Anxiety & Your Wellbeing | Breda Morrissey",
    desc: "Things to help boost your mood: CBT tips for stress, anxiety, overthinking and wellbeing from online counsellor Breda Morrissey.",
    canon: `${DOMAIN}/blog`, body, schema: [breadcrumb([["Home", "/"], ["Blog", "/blog"]])],
  });
}

function postPage(p, posts, { preview } = {}) {
  const live = sortPosts(posts.filter((x) => x.status === "published"));
  const idx = live.findIndex((x) => x.id === p.id);
  const newer = idx > 0 ? live[idx - 1] : null;
  const older = idx >= 0 && idx < live.length - 1 ? live[idx + 1] : null;
  const rt = readingTime(p);
  const topic = TOPIC[p.topic] ? p.topic : "services";
  const [h, t, label] = REL_COPY[topic];
  const more = live.filter((x) => x.id !== p.id && x.topic === topic).slice(0, 3);
  const nav = `<nav class="post-nav" aria-label="More articles">${older ? `<a href="/blog/${esc(older.slug)}"><small>‹ Older article</small>${esc(older.title)}</a>` : "<span></span>"}${newer ? `<a class="next" href="/blog/${esc(newer.slug)}"><small>Newer article ›</small>${esc(newer.title)}</a>` : "<span></span>"}</nav>`;
  const draftNote = p.status !== "published" ? `<div class="mockup-note" style="margin-bottom:1.5em"><strong>Draft preview.</strong> Only you can see this page while you are logged in to the admin.</div>` : "";
  const body = `<section class="page-hero">${RIPPLE}<div class="wrap article-head"><div>
${crumbs([["Home", "/"], ["Blog", "/blog"], ["Article"]])}
<p class="post-meta"><span class="tag">${esc(TOPIC[topic])}</span><span>${fmtDate(p.date)}</span><span>${rt} min read</span></p>
<h1>${esc(p.title)}</h1>
<div class="byline"><img src="/images/breda-morrissey-counsellor.jpg" alt="" width="46" height="46"><div><b>Breda Morrissey</b><span>Accredited counsellor &amp; CBT psychotherapist</span></div></div>
</div>${p.cover ? `<div class="media arch"><img src="${esc(p.cover)}" alt="" fetchpriority="high"></div>` : ""}</div></section>
<section><div class="wrap article-layout"><article class="article">${draftNote}
${(p.sections || []).map(articleSection).join("\n")}
<div class="tip-box"><h3 style="margin-top:0">${h}</h3><p>${t}</p><div class="btn-row" style="margin-top:.6em"><a class="btn btn-primary" href="${TOPIC_LINK[topic]}">${label}</a><a class="btn btn-ghost" href="/contact">Get in touch</a></div></div>
${nav}</article>
<aside class="aside" aria-label="About the author and related articles">
<div class="card blush"><div class="byline" style="margin:0 0 14px"><img src="/images/breda-morrissey-counsellor.jpg" alt="" width="46" height="46"><div><b>Breda Morrissey</b><span>BA (Hons) APCP</span></div></div>
<p style="font-size:.97rem">Accredited counsellor and psychotherapist offering online CBT, counselling and mindfulness for adults across Ireland and the UK.</p>
<a class="btn btn-primary" style="width:100%" href="/contact">Book a consultation</a></div>
${more.length ? `<div class="card"><h3>More on ${esc(TOPIC[topic].toLowerCase())}</h3><ul class="mini">${more.map((q) => `<li><a href="/blog/${esc(q.slug)}">${q.cover ? `<img src="${esc(q.cover)}" alt="" loading="lazy" width="64" height="64">` : ""}${esc(q.title)}</a></li>`).join("")}</ul></div>` : ""}
</aside></div></section>`;
  const url = `${DOMAIN}/blog/${p.slug}`;
  return fill(shell.blog, {
    title: `${p.metaTitle || p.title} | Breda Morrissey`, desc: p.description || p.excerpt || "", canon: url,
    ogImage: p.cover, ogType: "article", noindex: preview || p.status !== "published", body,
    schema: [{ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.date,
      image: abs(p.cover), url, mainEntityOfPage: url, timeRequired: `PT${rt}M`,
      author: { "@type": "Person", name: "Breda Morrissey", url: DOMAIN + "/" },
      publisher: { "@type": "Organization", name: "Breda Morrissey Counselling & CBT", logo: { "@type": "ImageObject", url: `${DOMAIN}/images/breda-morrissey-logo.svg` } } },
      breadcrumb([["Home", "/"], ["Blog", "/blog"], [p.title, `/blog/${p.slug}`]])],
  });
}

function customPage(pg, { preview } = {}) {
  const sections = pg.sections || [];
  const hasHero = sections.some((s) => s.type === "hero");
  const fallbackHero = hasHero ? "" : `<section class="page-hero">${RIPPLE}<div class="wrap">${crumbs([["Home", "/"], [pg.title]])}<h1>${esc(pg.title)}</h1>${pg.description ? `<p class="lead">${esc(pg.description)}</p>` : ""}</div></section>`;
  const draftNote = pg.status !== "published" ? `<div class="wrap" style="padding-top:20px"><div class="mockup-note"><strong>Draft preview.</strong> Only you can see this page while you are logged in.</div></div>` : "";
  const body = draftNote + fallbackHero + sections.map((s, i) => pageSection(s, pg, i)).join("\n");
  const firstImg = (sections.find((s) => s.image) || {}).image;
  return fill(shell.page, {
    title: `${pg.metaTitle || pg.title} | Breda Morrissey`, desc: pg.description || "", canon: `${DOMAIN}/${pg.slug}`,
    ogImage: firstImg, noindex: preview || pg.status !== "published" || pg.noindex, body,
    schema: [breadcrumb([["Home", "/"], [pg.title, `/${pg.slug}`]])],
  });
}

function notFound() {
  const body = `<section class="page-hero">${RIPPLE}<div class="wrap"><h1>Page not found</h1><p class="lead">The page you’re looking for has moved or no longer exists.</p>
<div class="btn-row"><a class="btn btn-primary" href="/">Go to the home page</a><a class="btn btn-ghost" href="/contact">Get in touch</a></div></div></section>`;
  return fill(shell.page, { title: "Page not found | Breda Morrissey", desc: "This page could not be found.", canon: DOMAIN + "/404", noindex: true, body });
}

function sitemap(posts, pages) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...STATIC_PAGES.map((u) => [u, today]),
    ...posts.filter((p) => p.status === "published").map((p) => [`/blog/${p.slug}`, p.updated ? p.updated.slice(0, 10) : p.date]),
    ...pages.filter((p) => p.status === "published" && !p.noindex).map((p) => [`/${p.slug}`, (p.updated || today).slice(0, 10)])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(([u, m]) => `  <url><loc>${DOMAIN}${u === "/" ? "/" : u}</loc><lastmod>${m}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}

module.exports = { blogIndex, postPage, customPage, notFound, sitemap, TOPIC };
