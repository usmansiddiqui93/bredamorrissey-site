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
    case "checklist": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${s.intro ? `<p>${esc(s.intro)}</p>` : ""}<ul>${toItems(s.items).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    case "quote": return `<blockquote>${esc(s.text)}${s.author ? `<br><span class="muted" style="font-size:.9rem">${esc(s.author)}</span>` : ""}</blockquote>`;
    case "faq": return `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${(s.faqs || []).filter((f) => f.q).map((f) => `<details style="background: #FFFFFF; border: 1px solid #E9DCE2; border-radius: 16px; padding: 4px 22px; margin-bottom: 10px"><summary style="cursor: pointer; padding: 14px 0; font-family: 'DM Sans', Arial, sans-serif; font-weight: 500; color: #4A2840">${esc(f.q)}</summary><div style="padding-bottom: 8px">${sanitize(f.a && f.a.includes("<") ? f.a : `<p>${esc(f.a || "")}</p>`)}</div></details>`).join("")}`;
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

/* ---------- blog (new design) ---------- */
const DM = "font-family: 'DM Sans', Arial, sans-serif";
const TOPIC_KEY = { anxiety: "anxiety", stress: "stress", services: "services" };
const ARROW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
const CAL = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93617F" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
const HERO_RIPPLE = '<svg aria-hidden="true" viewBox="0 0 1000 1000" style="position: absolute; right: -300px; top: -200px; width: 900px; height: 900px; pointer-events: none"><g fill="none" stroke="#C99AAE" stroke-width="1" opacity="0.45"><circle cx="500" cy="500" r="120"/><circle cx="500" cy="500" r="220"/><circle cx="500" cy="500" r="320"/><circle cx="500" cy="500" r="420"/></g></svg>';
const kicker = (t) => `<p style="display: flex; align-items: center; gap: 12px; margin: 0 0 16px; ${DM}; font-weight: 500; font-size: 16px; color: #7A4A6E"><span style="width: 32px; height: 1px; background: #C8A26A; display: inline-block"></span>${t}</p>`;
const crumbBar = (trail) => `<p style="margin: 0 0 18px; font-size: 14px; color: #6D5D69">${trail.map(([l, u]) => (u ? `<a href="${esc(u)}" style="color: #6D5D69">${esc(l)}</a>` : esc(l))).join(' <span aria-hidden="true">/</span> ')}</p>`;
const pill = (label, href, light) => `<a href="${href}" style="display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 28px; border-radius: 999px; ${light ? "border: 1.5px solid #C99AAE; color: #4A2840" : "background: #7A4A6E; color: #FFFFFF"}; text-decoration: none; ${DM}; font-weight: 700">${label}</a>`;

function postCard(p) {
  return `<a href="/blog/${esc(p.slug)}" data-filter-card data-topic="${esc(p.topic)}" style="display: flex; flex-direction: column; background: #FFFFFF; border: 1px solid #E9DCE2; border-radius: 24px; overflow: hidden; text-decoration: none; color: #2E2230; box-shadow: 0 14px 34px -28px rgba(58,32,52,0.45)">
  <div style="position: relative; padding-top: 62%; overflow: hidden; background: #E6D2DA">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">` : ""}<span style="position: absolute; left: 14px; top: 14px; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.94); color: #4A2840; ${DM}; font-weight: 700; font-size: 12px">${esc(TOPIC[p.topic] || "Wellbeing")}</span></div>
  <div style="padding: 22px 24px 24px; display: flex; flex-direction: column; flex: 1">
    <p style="margin: 0 0 10px; display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #6D5D69">${CAL}${fmtDate(p.date)} · ${readingTime(p)} min read</p>
    <h3 style="margin: 0 0 10px; ${DM}; font-weight: 500; font-size: 20px; line-height: 1.3; color: #4A2840; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden">${esc(p.title)}</h3>
    <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #6D5D69; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden">${esc(p.excerpt)}</p>
    <span style="margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 1px solid #F1E6EA"><span style="${DM}; font-weight: 700; font-size: 15px; color: #5C3553">Read article</span><span aria-hidden="true" style="flex: none; width: 38px; height: 38px; border-radius: 50%; background: #7A4A6E; display: grid; place-items: center">${ARROW}</span></span>
  </div></a>`;
}
function sortPosts(posts) { return [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date))); }
function pageHero(trail, kick, title, lead) {
  return `<section style="position: relative; overflow: hidden; background: linear-gradient(180deg, #F1E6EA 0%, #F8F2F4 80%, #FDFAFB 100%)">${HERO_RIPPLE}
  <div style="position: relative; max-width: 1200px; margin: 0 auto; padding: 88px 32px 104px"><div style="max-width: 760px">${crumbBar(trail)}${kicker(kick)}
  <h1 style="margin: 0; ${DM}; font-weight: 500; font-size: 56px; line-height: 1.1; letter-spacing: -0.01em; color: #4A2840">${title}</h1>
  <p style="margin: 24px 0 0; ${DM}; font-size: 22px; line-height: 1.5; color: #5C3553">${lead}</p></div></div></section>`;
}

function blogIndex(posts) {
  const live = sortPosts(posts.filter((p) => p.status === "published"));
  const [first, ...rest] = live;
  const feature = first ? `<a href="/blog/${esc(first.slug)}" style="display: flex; flex-wrap: wrap; background: #3A2034; border-radius: 36px; overflow: hidden; text-decoration: none; box-shadow: 0 30px 60px -36px rgba(58,32,52,0.6)">
    <div style="flex: 1 1 520px; min-height: 360px; background: #F6F1EA; display: grid; place-items: center; padding: 20px">${first.cover ? `<img src="${esc(first.cover)}" alt="" style="width: 100%; height: 100%; max-height: 400px; object-fit: contain; display: block">` : ""}</div>
    <div style="flex: 1 1 400px; padding: 48px 44px; display: flex; flex-direction: column; justify-content: center; color: #F8EEF2">
      <p style="margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; font-size: 14px; color: #E6D2DA"><span style="padding: 6px 12px; border-radius: 999px; background: rgba(248,238,242,0.14); color: #FFFFFF; ${DM}; font-weight: 700; font-size: 12.5px">Latest · ${esc(TOPIC[first.topic] || "Wellbeing")}</span>${fmtDate(first.date)} · ${readingTime(first)} min read</p>
      <h2 style="margin: 0 0 14px; ${DM}; font-weight: 500; font-size: 34px; line-height: 1.2; color: #FFFFFF">${esc(first.title)}</h2>
      <p style="margin: 0 0 24px; color: #E6D2DA">${esc(first.excerpt)}</p>
      <span style="align-self: flex-start; display: inline-flex; align-items: center; gap: 12px; min-height: 50px; padding: 0 8px 0 22px; border-radius: 999px; background: #F1E6EA; color: #3A2034; ${DM}; font-weight: 700">Read the article<span aria-hidden="true" style="width: 36px; height: 36px; border-radius: 50%; background: #5C3553; display: grid; place-items: center">${ARROW}</span></span>
    </div></a>` : "<p>No articles yet.</p>";
  const filters = [["all", "All articles"], ...Object.entries(TOPIC)].map(([k, v], i) =>
    `<button type="button" data-filter="${k}" aria-pressed="${i === 0}" style="min-height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid ${i === 0 ? "#7A4A6E" : "#E9DCE2"}; background: ${i === 0 ? "#7A4A6E" : "#FFFFFF"}; color: ${i === 0 ? "#FFFFFF" : "#4A2840"}; ${DM}; font-weight: 500; font-size: 15px; cursor: pointer">${esc(v)}</button>`).join("");
  const body = pageHero([["Home", "/"], ["Blog"]], "The blog", "Tips for stress, anxiety &amp; your wellbeing",
    "Practical CBT insights and gentle ideas to help you feel calmer and more in control, written by Breda Morrissey.") +
    `<section style="padding: 24px 0 104px"><div style="max-width: 1200px; margin: 0 auto; padding: 0 32px">${feature}
    <div class="blog-filters" role="group" aria-label="Filter articles by topic" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 56px 0 28px">${filters}</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px">${rest.map(postCard).join("")}</div>
    <div style="margin-top: 64px; background: #F1E6EA; border-radius: 32px; padding: 40px 44px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 40px">
      <div style="flex: 1 1 420px"><p style="margin: 0 0 6px; ${DM}; font-size: 26px; font-weight: 500; color: #4A2840">Ready to talk it through with someone?</p><p style="margin: 0; color: #5C3553">Articles can help, but you don’t have to work through things alone.</p></div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px">${pill("Book an initial consultation", "/contact")}${pill("Call 083 854 1298", "tel:+353838541298", true)}</div>
    </div></div></section>`;
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
  const related = live.filter((x) => x.id !== p.id).filter((x) => x.topic === topic).slice(0, 3);
  const draftNote = p.status !== "published" ? `<div style="margin-bottom: 24px; background: #FFF6D6; border: 1px dashed #C9A227; color: #6B5512; border-radius: 12px; padding: 14px 18px; font-size: 15px"><strong>Draft preview.</strong> Only you can see this page while you are logged in to the admin.</div>` : "";
  const toc = [];
  const slugH = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;|’/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const content = (p.sections || []).map(articleSection).join("\n").replace(/<h2>(.*?)<\/h2>/g, (m, t) => { const id = slugH(t) || `section-${toc.length + 1}`; if (t.replace(/<[^>]+>/g, "").length <= 60) toc.push([id, t]); return `<h2 id="${id}">${t}</h2>`; });
  const tocCard = toc.length > 1 ? `<nav aria-label="In this article" style="background: #FFFFFF; border: 1px solid #E9DCE2; border-radius: 28px; padding: 24px 26px 16px"><p style="margin: 0 0 10px; ${DM}; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #93617F">In this article</p><ol style="list-style: none; margin: 0; padding: 0">${toc.slice(0, 8).map(([id, t], i) => `<li style="margin: 0"><a href="#${id}" style="display: flex; gap: 12px; align-items: baseline; padding: 9px 0; border-top: 1px solid #F1E6EA; text-decoration: none; color: #4A2840; ${DM}; font-size: 15px; line-height: 1.35"><span style="flex: none; font-size: 12px; font-weight: 700; color: #93617F">${String(i + 1).padStart(2, "0")}</span>${t}</a></li>`).join("")}</ol><p style="margin: 12px 0 0; font-size: 13.5px; color: #6D5D69">${rt} min read</p></nav>` : "";
  const ratingCard = `<div style="background: #3A2034; border-radius: 28px; padding: 24px 26px; color: #F8EEF2"><div style="display: flex; align-items: center; gap: 14px"><span style="${DM}; font-size: 38px; font-weight: 700; line-height: 1; color: #FFFFFF">4.97</span><span><span aria-hidden="true" style="display: block; color: #C8A26A; letter-spacing: 3px">★★★★★</span><span style="font-size: 13.5px; color: #E6D2DA">10 verified client reviews on Doctify</span></span></div></div>`;
  const talkCard = `<div style="background: #FFFFFF; border: 1px solid #E9DCE2; border-radius: 28px; padding: 24px 26px"><p style="margin: 0 0 6px; ${DM}; font-weight: 700; color: #4A2840">Need to talk now?</p><p style="margin: 0 0 14px; font-size: 14.5px; color: #6D5D69">Call or WhatsApp, Mon–Thu 7am–7pm, Fri 7am–6pm.</p><a href="tel:+353838541298" style="display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 999px; border: 1.5px solid #C99AAE; color: #4A2840; text-decoration: none; ${DM}; font-weight: 700">Call 083 854 1298</a></div>`;
  const navCard = (x, lab, right) => x ? `<a href="/blog/${esc(x.slug)}" style="display: block; padding: 20px 22px; border: 1px solid #E9DCE2; border-radius: 18px; text-decoration: none; background: #FFFFFF${right ? "; text-align: right" : ""}"><span style="display: block; font-size: 13px; color: #6D5D69">${lab}</span><span style="${DM}; font-weight: 500; color: #4A2840">${esc(x.title)}</span></a>` : "<span></span>";
  const body = `<section style="position: relative; overflow: hidden; background: linear-gradient(180deg, #F1E6EA 0%, #F8F2F4 80%, #FDFAFB 100%)">${HERO_RIPPLE}
  <div style="position: relative; max-width: 1200px; margin: 0 auto; padding: 56px 32px 32px; display: flex; flex-wrap: wrap; align-items: center; gap: 56px">
    <div style="flex: 1 1 560px; min-width: 0">${crumbBar([["Home", "/"], ["Blog", "/blog"], ["Article"]])}
      <p style="margin: 0 0 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font-size: 14.5px; color: #6D5D69"><span style="padding: 6px 12px; border-radius: 999px; background: #FFFFFF; color: #5C3553; ${DM}; font-weight: 700; font-size: 12.5px">${esc(TOPIC[topic])}</span>${fmtDate(p.date)} · ${rt} min read</p>
      <h1 style="margin: 0; ${DM}; font-weight: 500; font-size: 50px; line-height: 1.12; letter-spacing: -0.01em; color: #4A2840; max-width: 22ch">${esc(p.title)}</h1>
      <div style="display: flex; align-items: center; gap: 14px; margin-top: 28px"><img src="/images/breda-morrissey-counsellor.jpg" alt="" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; object-position: center top"><span><span style="display: block; ${DM}; font-weight: 700; color: #4A2840">Breda Morrissey</span><span style="font-size: 14px; color: #6D5D69">Accredited counsellor &amp; CBT psychotherapist</span></span></div>
    </div>
    ${p.cover ? `<div style="flex: 0 1 340px; min-width: 240px; margin: 0 auto"><div style="border-radius: 200px 200px 32px 32px; overflow: hidden; aspect-ratio: 1 / 1; background: #E6D2DA; box-shadow: 0 24px 48px -24px rgba(58,32,52,0.35)"><img src="${esc(p.cover)}" alt="" style="width: 100%; height: 100%; object-fit: cover; display: block"></div></div>` : ""}
  </div></section>
  <section style="padding: 16px 0 104px"><div style="max-width: 1200px; margin: 0 auto; padding: 0 32px">
    <div class="post-layout" style="display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 72px; align-items: start">
      <article class="article" style="max-width: 70ch">${draftNote}${content}
        <div style="margin-top: 44px; background: #3A2034; border-radius: 28px; padding: 36px; color: #F8EEF2">
          <p style="margin: 0 0 8px; ${DM}; font-size: 24px; font-weight: 500; color: #FFFFFF">${h}</p>
          <p style="margin: 0 0 22px; color: #E6D2DA">${t}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px"><a href="${TOPIC_LINK[topic]}" style="display: inline-flex; align-items: center; min-height: 52px; padding: 0 28px; border-radius: 999px; background: #F1E6EA; color: #3A2034; text-decoration: none; ${DM}; font-weight: 700">${label}</a><a href="/contact" style="display: inline-flex; align-items: center; min-height: 52px; padding: 0 28px; border-radius: 999px; border: 1.5px solid rgba(248,238,242,0.5); color: #FFFFFF; text-decoration: none; ${DM}; font-weight: 700">Get in touch</a></div>
        </div>
        <nav aria-label="More articles" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 28px">${navCard(older, "‹ Older article")}${navCard(newer, "Newer article ›", true)}</nav>
      </article>
      <aside class="post-aside" aria-label="About the author and related articles" style="display: grid; gap: 14px; align-self: start">
        ${tocCard}
        <div style="background: #F1E6EA; border-radius: 28px; padding: 28px">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px"><img src="/images/breda-morrissey-counsellor.jpg" alt="" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; object-position: center top"><span><span style="display: block; ${DM}; font-weight: 700; color: #4A2840">Breda Morrissey</span><span style="font-size: 13.5px; color: #6D5D69">BA (Hons) APCP</span></span></div>
          <p style="margin: 0 0 18px; font-size: 15px; color: #4B3E49">Accredited counsellor and psychotherapist offering online CBT, counselling and mindfulness for adults across Ireland and the UK.</p>
          ${pill("Book a consultation", "/contact")}
        </div>
        ${more.length ? `<div style="background: #FFFFFF; border: 1px solid #E9DCE2; border-radius: 28px; padding: 26px"><p style="margin: 0 0 16px; ${DM}; font-weight: 700; color: #4A2840">More on ${esc(TOPIC[topic].toLowerCase())}</p><div style="display: grid; gap: 14px">${more.map((q) => `<a href="/blog/${esc(q.slug)}" style="display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; text-decoration: none">${q.cover ? `<img src="${esc(q.cover)}" alt="" style="width: 64px; height: 64px; border-radius: 12px; object-fit: cover">` : "<span></span>"}<span style="${DM}; font-weight: 500; font-size: 15px; line-height: 1.35; color: #4A2840">${esc(q.title)}</span></a>`).join("")}</div></div>` : ""}
              ${ratingCard}
        ${talkCard}
      </aside>
    </div></div></section>
  ${related.length ? `<section style="padding: 104px 0; background: #F8F2F4"><div style="max-width: 1200px; margin: 0 auto; padding: 0 32px"><div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 40px"><div>${kicker("From the blog")}<h2 style="margin: 0; ${DM}; font-weight: 500; font-size: 46px; line-height: 1.1; color: #4A2840">Keep reading</h2></div><a href="/blog" style="${DM}; font-weight: 700; color: #5C3553">View all articles →</a></div><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px">${related.map(postCard).join("")}</div></div></section>` : ""}`;
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
