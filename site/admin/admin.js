/* Breda Morrissey website admin (vanilla JS, no build step) */
(function () {
  "use strict";
  var app = document.getElementById("app");
  var S = { me: null, posts: [], pages: [], subs: [], media: [] };
  var doc = null, dirty = false, currentMsg = null;

  var SITE_IMAGES = ["breda-morrissey-counsellor.jpg", "breda-morrissey-avatar.jpg", "calm-support.jpg", "january-gentle-start.webp",
    "september-fresh-start.webp", "do-you-overthink.webp", "christmas-calm.webp", "exam-stress.webp", "how-to-stop-overthinking.webp",
    "thoughts-notebook.webp", "dementia-caregivers.jpg", "hidden-weight-of-caring.webp", "august-mental-health-reset.webp",
    "understanding-anxiety-cbt-cycle.webp", "cbt-working-with-stress.webp", "overthinking-reframes.webp"].map(function (f) { return { url: "/images/" + f, name: f }; });

  var TOPICS = { anxiety: "Anxiety & overthinking", stress: "Stress & burnout", services: "Wellbeing" };
  var LABELS = { hero: "Page header", text: "Text", imageText: "Image + text", checklist: "Checklist", quote: "Quote", faq: "FAQs", image: "Image", cta: "Call to action" };
  var PAGE_TYPES = ["hero", "text", "imageText", "checklist", "quote", "faq", "image", "cta"];
  var POST_TYPES = ["text", "imageText", "image", "checklist", "quote", "faq", "cta"];
  var BG = "select:=Plain|soft=Soft blush|blush=Blush|dark=Dark plum";
  var FIELDS = {
    hero: [["kicker", "Small label above the heading"], ["heading", "Heading"], ["text", "Introduction", "textarea"], ["image", "Image (optional)", "image"], ["imageAlt", "Image description (alt text)"], ["buttonLabel", "Button text"], ["buttonLink", "Button link", "", "e.g. /contact"]],
    text: [["kicker", "Small label (optional)"], ["heading", "Heading (optional)"], ["html", "Text", "rich"], ["background", "Background", BG]],
    imageText: [["kicker", "Small label (optional)"], ["heading", "Heading"], ["html", "Text", "rich"], ["image", "Image", "image"], ["imageAlt", "Image description (alt text)"], ["side", "Image position", "select:right=Image on the right|left=Image on the left"], ["imageShape", "Image shape", "select:rounded=Rounded corners|arch=Arch"], ["buttonLabel", "Button text (optional)"], ["buttonLink", "Button link"], ["background", "Background", BG]],
    checklist: [["kicker", "Small label (optional)"], ["heading", "Heading"], ["intro", "Intro text (optional)", "textarea"], ["items", "List items (one per line)", "textarea"], ["columns", "Columns", "select:1=One column|2=Two columns"], ["background", "Background", BG]],
    quote: [["text", "Quote", "textarea"], ["author", "Name (optional)"], ["background", "Background", BG]],
    faq: [["kicker", "Small label (optional)"], ["heading", "Heading"], ["faqs", "Questions and answers", "faqs"], ["background", "Background", BG]],
    image: [["image", "Image", "image"], ["alt", "Image description (alt text)"], ["caption", "Caption (optional)"]],
    cta: [["heading", "Heading"], ["text", "Text", "textarea"], ["buttonLabel", "Button text", "", "e.g. Book a consultation"], ["buttonLink", "Button link", "", "e.g. /contact"]],
  };
  var POST_HIDE = ["kicker", "background", "side", "imageShape", "buttonLabel", "buttonLink"];

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function toast(msg, err) {
    var t = $("#toast"); t.textContent = msg; t.className = "show" + (err ? " err" : "");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ""; }, 3200);
  }
  function slugify(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }); }
  function fmtDateTime(iso) { var d = new Date(iso); return d.toLocaleString("en-IE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function api(action, opts) {
    opts = opts || {};
    var q = "action=" + action + (opts.query ? "&" + opts.query : "");
    return fetch("/api/admin?" + q, {
      method: opts.method || "GET", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "bm-admin" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "Server error (" + r.status + ")" }; }).then(function (j) {
        if (r.status === 401 && action !== "login") { S.me.authed = false; renderLogin(); throw new Error("Please log in again."); }
        if (!r.ok || j.ok === false) throw new Error(j.error || "Something went wrong.");
        return j;
      });
    });
  }
  function confirmLeave() { return !dirty || window.confirm("You have unsaved changes. Leave without saving?"); }
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- login ---------- */
  function renderLogin() {
    app.innerHTML = '<div class="login"><form class="box" id="loginForm">' +
      '<img src="/images/breda-morrissey-logo.svg" alt="Breda Morrissey Counselling &amp; CBT">' +
      "<h1>Website admin</h1><p>Log in to manage enquiries, blog posts and pages.</p>" +
      (S.me && !S.me.passwordSet ? '<div class="notice warn">ADMIN_PASSWORD is not set yet. Add it in Vercel → Settings → Environment Variables, then redeploy.</div>' : "") +
      '<div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required autofocus></div>' +
      '<button class="btn" style="width:100%;justify-content:center" type="submit">Log in</button>' +
      '<p id="loginErr" style="color:var(--err);margin:12px 0 0"></p></form></div>';
    $("#loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      api("login", { method: "POST", body: { password: $("#pw").value } })
        .then(function () { S.me.authed = true; loadAll().then(route); })
        .catch(function (err) { $("#loginErr").textContent = err.message; });
    });
  }

  /* ---------- layout ---------- */
  function unread() { return S.subs.filter(function (s) { return !s.read; }).length; }
  function shell(active, inner) {
    var n = unread();
    var link = function (h, label, key, extra) { return '<a href="#/' + h + '" class="' + (active === key ? "on" : "") + '"><span>' + label + "</span>" + (extra || "") + "</a>"; };
    app.innerHTML = '<div class="shell"><aside class="side"><a class="logo" href="#/"><img src="/images/breda-morrissey-logo-white.svg" alt="Breda Morrissey"></a><nav>' +
      link("", "Dashboard", "dash") +
      link("inbox", "Enquiries", "inbox", n ? '<span class="badge">' + n + "</span>" : "") +
      link("posts", "Blog posts", "posts") + link("pages", "Pages", "pages") + link("media", "Media library", "media") + link("help", "Help", "help") +
      '</nav><div class="foot"><a href="/" target="_blank" rel="noopener">View website ↗</a><a href="#" id="logout">Log out</a></div></aside>' +
      '<main class="main">' + inner + "</main></div>";
    $("#logout").addEventListener("click", function (e) {
      e.preventDefault(); if (!confirmLeave()) return; dirty = false;
      api("logout", { method: "POST" }).finally(function () { S.me.authed = false; renderLogin(); });
    });
  }
  function notices() {
    var out = "";
    if (!S.me || !S.me.vercel) return '<div class="notice info">Local preview mode: content is saved on this computer only.</div>';
    if (S.me && !S.me.storage) out += '<div class="notice warn"><b>Storage not connected.</b> Changes and enquiries are only kept temporarily. In Vercel open Storage → connect <b>Upstash Redis</b> (free) to this project, then redeploy.</div>';
    if (S.me && !S.me.blob) out += '<div class="notice warn"><b>Image storage not connected.</b> To upload images on the live site, open Vercel → Storage → create a <b>Blob</b> store for this project, then redeploy.</div>';
    return out;
  }

  /* ---------- dashboard ---------- */
  function renderDash() {
    var pub = S.posts.filter(function (p) { return p.status === "published"; }).length;
    var drafts = S.posts.length - pub + S.pages.filter(function (p) { return p.status !== "published"; }).length;
    var recent = S.subs.slice(0, 5);
    shell("dash", '<div class="topline"><h1>Welcome back, Breda</h1><div class="actions"><a class="btn" href="#/posts/new">New blog post</a><a class="btn ghost" href="#/pages/new">New page</a></div></div>' + notices() +
      '<div class="grid stats">' +
      '<a class="card stat" href="#/inbox" style="text-decoration:none"><b>' + unread() + "</b><span>New enquiries</span></a>" +
      '<a class="card stat" href="#/posts" style="text-decoration:none"><b>' + pub + "</b><span>Published blog posts</span></a>" +
      '<a class="card stat" href="#/pages" style="text-decoration:none"><b>' + S.pages.length + "</b><span>Custom pages</span></a>" +
      '<div class="card stat"><b>' + drafts + "</b><span>Drafts</span></div></div>" +
      '<div class="card" style="margin-top:16px"><div class="topline" style="margin-bottom:8px"><h2 style="margin:0">Latest enquiries</h2><a href="#/inbox">View all</a></div>' +
      (recent.length ? "<table><tbody>" + recent.map(function (s) {
        return '<tr><td><a class="title" href="#/inbox/' + s.id + '">' + esc(s.name) + '</a><span class="sub">' + esc(s.message.slice(0, 90)) + "</span></td><td>" + (s.read ? "" : '<span class="pill new">New</span>') + '</td><td style="text-align:right;color:var(--muted)">' + fmtDateTime(s.created) + "</td></tr>";
      }).join("") + "</tbody></table>" : '<p class="empty">No enquiries yet. Messages sent through the contact form will appear here.</p>') + "</div>");
  }

  /* ---------- inbox ---------- */
  function renderInbox(id) {
    var item = S.subs.find(function (s) { return s.id === id; }) || null;
    currentMsg = item;
    if (item && !item.read) { item.read = true; api("submissions", { method: "POST", body: { id: item.id, read: true } }).catch(function () {}); }
    var list = S.subs.map(function (s) {
      return '<button data-id="' + s.id + '" class="' + (s.read ? "" : "unread ") + (item && item.id === s.id ? "on" : "") + '"><b>' + esc(s.name) + "</b><small>" + fmtDateTime(s.created) + "</small><small>" + esc(s.message.slice(0, 80)) + "</small></button>";
    }).join("");
    var detail = item ? '<div class="card msg"><div class="topline"><h2 style="margin:0">' + esc(item.name) + '</h2><span class="sub" style="color:var(--muted)">' + fmtDateTime(item.created) + "</span></div>" +
      "<dl><dt>Email</dt><dd><a href=\"mailto:" + esc(item.email) + '">' + esc(item.email) + "</a></dd><dt>Phone</dt><dd>" + (item.phone ? '<a href="tel:' + esc(item.phone) + '">' + esc(item.phone) + "</a>" : "–") + "</dd><dt>Page</dt><dd>" + esc(item.page || "/contact") + "</dd></dl>" +
      '<div class="body">' + esc(item.message) + "</div>" +
      '<div class="actions" style="justify-content:flex-start"><a class="btn" href="mailto:' + esc(item.email) + "?subject=" + encodeURIComponent("Re: your enquiry") + '">Reply by email</a>' +
      (item.phone ? '<a class="btn ghost" href="tel:' + esc(item.phone) + '">Call</a>' : "") +
      '<button class="btn ghost" id="toggleRead">Mark as unread</button><button class="btn danger" id="delMsg">Delete</button></div></div>'
      : '<div class="card empty">' + (S.subs.length ? "Select an enquiry to read it." : "No enquiries yet.") + "</div>";
    shell("inbox", '<div class="topline"><h1>Enquiries</h1>' + (S.subs.length ? '<button class="btn ghost" id="csv">Download CSV</button>' : "") + "</div>" + notices() +
      '<p style="color:var(--muted);margin-top:-8px">Messages from the website contact form. They may contain sensitive personal information, so delete any you no longer need.</p>' +
      '<div class="inbox"><div class="card msglist">' + (list || '<p class="empty">Nothing here yet.</p>') + "</div>" + detail + "</div>");
    $$(".msglist button").forEach(function (b) { b.addEventListener("click", function () { location.hash = "#/inbox/" + b.dataset.id; }); });
    if (item) {
      $("#toggleRead").addEventListener("click", function () {
        item.read = false;
        api("submissions", { method: "POST", body: { id: item.id, read: false } }).then(function () { toast("Marked as unread"); location.hash = "#/inbox"; if (location.hash === "#/inbox") renderInbox(null); });
      });
      $("#delMsg").addEventListener("click", function () {
        if (!confirm("Delete this enquiry permanently?")) return;
        api("submissions", { method: "DELETE", query: "id=" + item.id }).then(function () {
          S.subs = S.subs.filter(function (s) { return s.id !== item.id; }); toast("Enquiry deleted"); location.hash = "#/inbox";
        }).catch(function (e) { toast(e.message, true); });
      });
    }
    var csv = $("#csv");
    if (csv) csv.addEventListener("click", function () {
      var rows = [["Date", "Name", "Email", "Phone", "Message"]].concat(S.subs.map(function (s) { return [s.created, s.name, s.email, s.phone, s.message]; }));
      var text = rows.map(function (r) { return r.map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "enquiries.csv"; a.click();
    });
  }

  /* ---------- lists ---------- */
  function renderList(kind) {
    var items = kind === "posts" ? S.posts.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }) : S.pages;
    var isPost = kind === "posts";
    var rows = items.map(function (p) {
      var url = isPost ? "/blog/" + p.slug : "/" + p.slug;
      return "<tr><td><a class=\"title\" href=\"#/" + kind + "/" + p.id + '">' + esc(p.title) + '</a><span class="sub">' + esc(url) + "</span></td>" +
        '<td><span class="pill ' + p.status + '">' + (p.status === "published" ? "Published" : "Draft") + "</span></td>" +
        (isPost ? "<td>" + esc(TOPICS[p.topic] || "") + "</td><td>" + fmtDate(p.date) + "</td>" : "<td>" + fmtDate(p.updated) + "</td>") +
        '<td><div class="actions"><a class="btn sm ghost" href="#/' + kind + "/" + p.id + '">Edit</a><a class="btn sm ghost" target="_blank" rel="noopener" href="' + url + "?v=" + Date.now() + '">View</a><button class="btn sm danger" data-del="' + p.id + '">Delete</button></div></td></tr>';
    }).join("");
    shell(kind, '<div class="topline"><h1>' + (isPost ? "Blog posts" : "Pages") + '</h1><a class="btn" href="#/' + kind + '/new">' + (isPost ? "New blog post" : "New page") + "</a></div>" + notices() +
      (isPost ? "" : '<p style="color:var(--muted);margin-top:-8px">Create new pages built from sections (for example a page about a specific service). The main pages (Home, CBT for Anxiety, CBT for Stress, Services, FAQ, Contact) are part of the site design and are edited by your web developer.</p>') +
      '<div class="card">' + (rows ? "<table><thead><tr><th>Title</th><th>Status</th>" + (isPost ? "<th>Topic</th><th>Date</th>" : "<th>Updated</th>") + "<th></th></tr></thead><tbody>" + rows + "</tbody></table>" : '<p class="empty">Nothing here yet. Click “' + (isPost ? "New blog post" : "New page") + "” to create one.</p>") + "</div>");
    $$("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = items.find(function (x) { return x.id === b.dataset.del; });
        if (!confirm("Delete “" + p.title + "”? This cannot be undone.")) return;
        api(kind, { method: "DELETE", query: "id=" + p.id }).then(function () {
          S[kind] = S[kind].filter(function (x) { return x.id !== p.id; }); toast("Deleted"); renderList(kind);
        }).catch(function (e) { toast(e.message, true); });
      });
    });
  }

  /* ---------- editor ---------- */
  function blankSection(type) {
    var s = { type: type };
    if (type === "faq") s.faqs = [{ q: "", a: "" }];
    if (type === "imageText") { s.side = "right"; s.imageShape = "rounded"; }
    if (type === "checklist") s.columns = "1";
    if (type === "cta") { s.heading = "Ready to take the next step?"; s.buttonLabel = "Book a consultation"; s.buttonLink = "/contact"; }
    return s;
  }
  function renderEditor(kind, id) {
    var isPost = kind === "posts";
    var src = id === "new" ? null : S[kind].find(function (x) { return x.id === id; });
    if (id !== "new" && !src) { location.hash = "#/" + kind; return; }
    doc = src ? JSON.parse(JSON.stringify(src)) : (isPost
      ? { title: "", slug: "", status: "draft", date: new Date().toISOString().slice(0, 10), topic: "anxiety", excerpt: "", cover: "", description: "", metaTitle: "", sections: [blankSection("text")] }
      : { title: "", slug: "", status: "draft", description: "", metaTitle: "", noindex: false, sections: [blankSection("hero"), blankSection("text")] });
    doc._slugTouched = Boolean(src);
    dirty = false;
    var types = isPost ? POST_TYPES : PAGE_TYPES;
    var main = '<div class="topline"><h1>' + (src ? "Edit " + (isPost ? "blog post" : "page") : "New " + (isPost ? "blog post" : "page")) + '</h1><div class="actions"><a class="btn ghost" href="#/' + kind + '">Back</a>' +
      (src ? '<a class="btn ghost" id="viewBtn" target="_blank" rel="noopener" href="' + (isPost ? "/blog/" : "/") + esc(doc.slug) + "?v=" + Date.now() + '">View</a>' : "") +
      '<button class="btn" id="saveBtn">Save</button></div></div>' + notices() +
      '<div class="editor"><div>' +
      '<div class="card" style="margin-bottom:16px">' +
      field("title", isPost ? "Post title" : "Page title", "text", doc.title) +
      '<div class="field"><label for="f-slug">Web address</label><div style="display:flex;align-items:center;gap:6px"><span style="color:var(--muted);white-space:nowrap">bredamorrissey.com' + (isPost ? "/blog/" : "/") + '</span><input id="f-slug" data-doc="slug" value="' + esc(doc.slug) + '"></div><span class="hint">Lowercase words separated by hyphens. Changing it later breaks old links.</span></div>' +
      (isPost ? '<div class="field"><label for="f-excerpt">Short summary <span class="count" data-count="excerpt"></span></label><textarea id="f-excerpt" data-doc="excerpt" rows="2">' + esc(doc.excerpt) + '</textarea><span class="hint">Shown on the blog page cards.</span></div>' : "") +
      "</div>" +
      '<h2>Content sections</h2><div class="sections" id="sections"></div>' +
      '<div class="addbar" style="margin-top:12px"><span>Add a section:</span>' + types.map(function (t) { return '<button class="btn sm ghost" data-add="' + t + '">+ ' + LABELS[t] + "</button>"; }).join("") + "</div>" +
      "</div><aside>" +
      '<div class="card"><h3>Publishing</h3><div class="field"><label for="f-status">Status</label><select id="f-status" data-doc="status"><option value="draft">Draft (hidden)</option><option value="published">Published (live)</option></select></div>' +
      (isPost ? '<div class="field"><label for="f-date">Date</label><input type="date" id="f-date" data-doc="date" value="' + esc(doc.date) + '"></div>' +
        '<div class="field"><label for="f-topic">Topic</label><select id="f-topic" data-doc="topic">' + Object.keys(TOPICS).map(function (k) { return '<option value="' + k + '">' + TOPICS[k] + "</option>"; }).join("") + "</select></div>" : "") +
      (!isPost ? '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="f-noindex" data-doc="noindex"> Hide from Google</label>' : "") +
      '<button class="btn" style="width:100%;justify-content:center;margin-top:14px" id="saveBtn2">Save</button></div>' +
      (isPost ? '<div class="card"><h3>Cover image</h3>' + imageField("doc", "cover", doc.cover) + "</div>" : "") +
      '<div class="card"><h3>Google search preview</h3>' +
      '<div class="field"><label for="f-metaTitle">SEO title <span class="count" data-count="metaTitle"></span></label><input id="f-metaTitle" data-doc="metaTitle" value="' + esc(doc.metaTitle) + '" placeholder="Defaults to the title"></div>' +
      '<div class="field"><label for="f-description">Meta description <span class="count" data-count="description"></span></label><textarea id="f-description" data-doc="description" rows="3">' + esc(doc.description) + "</textarea></div>" +
      '<div class="serp"><div class="u">bredamorrissey.com › <span id="serpU"></span></div><div class="t" id="serpT"></div><div class="d" id="serpD"></div></div></div>' +
      "</aside></div>";
    shell(kind, main);
    $("#f-status").value = doc.status;
    if (isPost) $("#f-topic").value = doc.topic;
    if (!isPost) $("#f-noindex").checked = Boolean(doc.noindex);
    renderSections(kind);
    updateMeta(kind);

    $(".editor").addEventListener("input", function (e) {
      var el = e.target, k = el.dataset.doc;
      if (!k) return;
      doc[k] = el.type === "checkbox" ? el.checked : el.value;
      if (k === "slug") doc._slugTouched = true;
      if (k === "title" && !doc._slugTouched) { doc.slug = slugify(doc.title); $("#f-slug").value = doc.slug; }
      dirty = true; updateMeta(kind);
    });
    $(".editor").addEventListener("change", function (e) { if (e.target.dataset.doc) { var el = e.target; doc[el.dataset.doc] = el.type === "checkbox" ? el.checked : el.value; dirty = true; } });
    $$("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () { doc.sections.push(blankSection(b.dataset.add)); dirty = true; renderSections(kind, doc.sections.length - 1); });
    });
    $("#saveBtn").addEventListener("click", function () { save(kind); });
    $("#saveBtn2").addEventListener("click", function () { save(kind); });
    bindImageFields($(".editor aside"), function (path, url) { doc.cover = url; dirty = true; });
  }
  function field(k, label, type, val) {
    return '<div class="field"><label for="f-' + k + '">' + label + '</label><input id="f-' + k + '" data-doc="' + k + '" type="' + type + '" value="' + esc(val) + '"></div>';
  }
  function updateMeta(kind) {
    var lim = { metaTitle: 60, description: 160, excerpt: 200 };
    $$("[data-count]").forEach(function (c) {
      var k = c.dataset.count, n = String(doc[k] || "").length;
      c.textContent = n + "/" + lim[k]; c.classList.toggle("over", n > lim[k]);
    });
    $("#serpU").textContent = (kind === "posts" ? "blog › " : "") + (doc.slug || "your-page");
    $("#serpT").textContent = (doc.metaTitle || doc.title || "Title") + " | Breda Morrissey";
    $("#serpD").textContent = doc.description || doc.excerpt || "Add a meta description so people know what this page is about.";
  }

  function sectionSummary(s) {
    return s.heading || s.text || (s.html || "").replace(/<[^>]+>/g, " ").trim().slice(0, 80) || (s.image ? s.image.split("/").pop() : "") || "Empty";
  }
  function renderSections(kind, openIndex) {
    var isPost = kind === "posts";
    var wrap = $("#sections");
    wrap.innerHTML = doc.sections.map(function (s, i) {
      var fields = (FIELDS[s.type] || []).filter(function (f) { return !(isPost && POST_HIDE.indexOf(f[0]) > -1); });
      var open = openIndex === undefined ? doc.sections.length <= 3 : openIndex === i;
      return '<div class="sec' + (open ? "" : " closed") + '" data-i="' + i + '"><div class="sec-head"><b>' + LABELS[s.type] + '</b><span class="sum">' + esc(sectionSummary(s)) + "</span>" +
        '<button class="iconbtn" data-move="-1" title="Move up" aria-label="Move up">↑</button><button class="iconbtn" data-move="1" title="Move down" aria-label="Move down">↓</button><button class="iconbtn" data-remove title="Remove section" aria-label="Remove section">✕</button></div>' +
        '<div class="sec-body">' + fields.map(function (f) { return sectionField(s, i, f); }).join("") + "</div></div>";
    }).join("") || '<div class="card empty">No sections yet. Add one below.</div>';

    $$(".sec").forEach(function (el) {
      var i = Number(el.dataset.i);
      $(".sec-head", el).addEventListener("click", function (e) { if (e.target.closest("button")) return; el.classList.toggle("closed"); });
      $("[data-remove]", el).addEventListener("click", function () { if (!confirm("Remove this section?")) return; doc.sections.splice(i, 1); dirty = true; renderSections(kind); });
      $$("[data-move]", el).forEach(function (b) {
        b.addEventListener("click", function () {
          var j = i + Number(b.dataset.move); if (j < 0 || j >= doc.sections.length) return;
          var t = doc.sections[i]; doc.sections[i] = doc.sections[j]; doc.sections[j] = t; dirty = true; renderSections(kind, j);
        });
      });
      el.addEventListener("input", function (e) {
        var t = e.target, s = doc.sections[i];
        if (t.dataset.k) { s[t.dataset.k] = t.value; }
        if (t.dataset.faq !== undefined) { s.faqs[Number(t.dataset.faq)][t.dataset.fk] = t.value; }
        if (t.classList.contains("rte")) { s.html = t.innerHTML; }
        dirty = true;
        $(".sum", el).textContent = sectionSummary(s);
      });
      el.addEventListener("change", function (e) { var t = e.target; if (t.dataset.k) { doc.sections[i][t.dataset.k] = t.value; dirty = true; } });
      $$("[data-addfaq]", el).forEach(function (b) { b.addEventListener("click", function () { doc.sections[i].faqs = doc.sections[i].faqs || []; doc.sections[i].faqs.push({ q: "", a: "" }); dirty = true; renderSections(kind, i); }); });
      $$("[data-delfaq]", el).forEach(function (b) { b.addEventListener("click", function () { doc.sections[i].faqs.splice(Number(b.dataset.delfaq), 1); dirty = true; renderSections(kind, i); }); });
      bindRte(el);
      bindImageFields(el, function (path, url) { doc.sections[i][path] = url; dirty = true; $(".sum", el).textContent = sectionSummary(doc.sections[i]); });
    });
  }
  function sectionField(s, i, f) {
    var k = f[0], label = f[1], type = f[2] || "", ph = f[3] || "";
    var id = "s" + i + "-" + k, v = s[k];
    if (type === "rich") {
      return '<div class="field"><label>' + label + '</label><div class="rte-wrap"><div class="rte-bar">' +
        '<button type="button" data-cmd="h2" title="Heading">H2</button><button type="button" data-cmd="h3" title="Sub-heading">H3</button><button type="button" data-cmd="p" title="Paragraph">¶</button>' +
        '<button type="button" data-cmd="bold" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic"><i>I</i></button>' +
        '<button type="button" data-cmd="ul" title="Bullet list">• List</button><button type="button" data-cmd="ol" title="Numbered list">1. List</button>' +
        '<button type="button" data-cmd="quote" title="Quote">“ ”</button><button type="button" data-cmd="link" title="Link">Link</button><button type="button" data-cmd="clear" title="Clear formatting">Clear</button>' +
        '</div><div class="rte" contenteditable="true">' + (v || "<p><br></p>") + "</div></div></div>";
    }
    if (type === "textarea") {
      if (k === "items" && Array.isArray(v)) v = v.join("\n");
      return '<div class="field"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" data-k="' + k + '" rows="' + (k === "items" ? 6 : 3) + '">' + esc(v) + "</textarea></div>";
    }
    if (type === "image") return '<div class="field"><label>' + label + "</label>" + imageField("sec", k, v) + "</div>";
    if (type.indexOf("select:") === 0) {
      var opts = type.slice(7).split("|").map(function (o) { var p = o.split("="); return '<option value="' + p[0] + '"' + (String(v || "") === p[0] ? " selected" : "") + ">" + p[1] + "</option>"; }).join("");
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-k="' + k + '">' + opts + "</select></div>";
    }
    if (type === "faqs") {
      return '<div class="field"><label>' + label + "</label>" + (s.faqs || []).map(function (q, j) {
        return '<div class="faqrow"><div><input placeholder="Question" data-faq="' + j + '" data-fk="q" value="' + esc(q.q) + '" style="margin-bottom:6px"><textarea placeholder="Answer" data-faq="' + j + '" data-fk="a" rows="2">' + esc(q.a) + '</textarea></div><button type="button" class="iconbtn" data-delfaq="' + j + '" aria-label="Remove question">✕</button></div>';
      }).join("") + '<button type="button" class="btn sm ghost" data-addfaq>+ Add question</button></div>';
    }
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '"></div>';
  }

  /* ---------- rich text ---------- */
  var ALLOWED = { P: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, BR: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1 };
  function cleanHtml(html) {
    var tpl = document.createElement("template"); tpl.innerHTML = html;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 8) { n.remove(); return; }
        if (n.nodeType !== 1) return;
        walk(n);
        if (/^(SCRIPT|STYLE|META|LINK|TITLE|XML)$/.test(n.tagName)) { n.remove(); return; }
        if (n.tagName === "H1") { var h = document.createElement("h2"); h.innerHTML = n.innerHTML; n.replaceWith(h); return; }
        if (n.tagName === "DIV") { var p = document.createElement("p"); p.innerHTML = n.innerHTML; n.replaceWith(p); return; }
        if (!ALLOWED[n.tagName]) { n.replaceWith.apply(n, Array.prototype.slice.call(n.childNodes)); return; }
        Array.prototype.slice.call(n.attributes).forEach(function (a) { if (!(n.tagName === "A" && a.name === "href")) n.removeAttribute(a.name); });
      });
    })(tpl.content);
    return tpl.innerHTML;
  }
  function bindRte(root) {
    $$(".rte-wrap", root).forEach(function (w) {
      var ed = $(".rte", w);
      $$(".rte-bar button", w).forEach(function (b) {
        b.addEventListener("mousedown", function (e) { e.preventDefault(); });
        b.addEventListener("click", function () {
          ed.focus();
          var c = b.dataset.cmd;
          if (c === "h2" || c === "h3" || c === "p") document.execCommand("formatBlock", false, c.toUpperCase());
          else if (c === "quote") document.execCommand("formatBlock", false, "BLOCKQUOTE");
          else if (c === "ul") document.execCommand("insertUnorderedList");
          else if (c === "ol") document.execCommand("insertOrderedList");
          else if (c === "link") { var u = prompt("Link address (e.g. https://… or /contact)"); if (u) document.execCommand("createLink", false, u); }
          else if (c === "clear") { document.execCommand("removeFormat"); document.execCommand("formatBlock", false, "P"); }
          else document.execCommand(c);
          ed.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
      ed.addEventListener("paste", function (e) {
        e.preventDefault();
        var cd = e.clipboardData, html = cd.getData("text/html"), text = cd.getData("text/plain");
        if (html) document.execCommand("insertHTML", false, cleanHtml(html));
        else document.execCommand("insertHTML", false, text.split(/\n{2,}/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""));
      });
    });
  }

  /* ---------- images ---------- */
  function imageField(scope, path, url) {
    return '<div class="imgfield" data-img="' + path + '"><div class="thumb" style="' + (url ? "background-image:url('" + esc(url) + "')" : "") + '"></div><div class="actions" style="justify-content:flex-start">' +
      '<label class="btn sm">Upload<input type="file" accept="image/*" hidden></label><button type="button" class="btn sm ghost" data-lib>Choose</button>' +
      (url ? '<button type="button" class="btn sm danger" data-clear>Remove</button>' : "") + "</div></div>";
  }
  function bindImageFields(root, onSet) {
    $$(".imgfield", root).forEach(function (f) {
      var path = f.dataset.img;
      var set = function (url) {
        onSet(path, url);
        $(".thumb", f).style.backgroundImage = url ? "url('" + url + "')" : "";
        var clr = $("[data-clear]", f);
        if (url && !clr) { var b = document.createElement("button"); b.type = "button"; b.className = "btn sm danger"; b.dataset.clear = ""; b.textContent = "Remove"; b.addEventListener("click", function () { set(""); }); $(".actions", f).appendChild(b); }
        if (!url && clr) clr.remove();
      };
      $("input[type=file]", f).addEventListener("change", function (e) {
        var file = e.target.files[0]; if (!file) return;
        toast("Uploading…");
        uploadFile(file).then(function (r) { set(r.url); toast("Image uploaded"); }).catch(function (err) { toast(err.message, true); });
        e.target.value = "";
      });
      $("[data-lib]", f).addEventListener("click", function () { openLibrary(set); });
      var clr = $("[data-clear]", f); if (clr) clr.addEventListener("click", function () { set(""); });
    });
  }
  function readAsDataURL(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function compress(file) {
    if (file.type === "image/gif" || !/^image\//.test(file.type)) return readAsDataURL(file).then(function (d) { return { name: file.name, type: file.type, data: d }; });
    return readAsDataURL(file).then(function (src) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () {
          var max = 2000, w = im.naturalWidth, h = im.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement("canvas"); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) {
            if (b && b.type === "image/webp") return readAsDataURL(b).then(function (d) { res({ name: file.name, type: "image/webp", data: d }); });
            cv.toBlob(function (b2) { readAsDataURL(b2).then(function (d) { res({ name: file.name, type: "image/jpeg", data: d }); }); }, "image/jpeg", 0.85);
          }, "image/webp", 0.84);
        };
        im.onerror = function () { rej(new Error("That file could not be read as an image.")); };
        im.src = src;
      });
    });
  }
  function uploadFile(file) {
    return compress(file).then(function (payload) { return api("upload", { method: "POST", body: payload }); })
      .then(function (r) { S.media.unshift({ url: r.url, name: r.name, size: r.size, uploaded: new Date().toISOString() }); return r; });
  }
  function openLibrary(onPick) {
    var m = document.createElement("div"); m.className = "modal";
    var all = S.media.concat(SITE_IMAGES);
    m.innerHTML = '<div class="box" role="dialog" aria-label="Choose an image"><div class="topline"><h2 style="margin:0">Choose an image</h2><div class="actions"><label class="btn sm">Upload new<input type="file" accept="image/*" hidden></label><button class="btn sm ghost" data-close>Close</button></div></div>' +
      '<div class="mediagrid">' + all.map(function (x) { return '<button class="m" data-url="' + esc(x.url) + '"><div class="im" style="background-image:url(\'' + esc(x.url) + '\')"></div><span>' + esc(x.name) + "</span></button>"; }).join("") + "</div></div>";
    document.body.appendChild(m);
    var close = function () { m.remove(); };
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.closest("[data-close]")) return close();
      var b = e.target.closest("[data-url]"); if (b) { onPick(b.dataset.url); close(); }
    });
    $("input[type=file]", m).addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return; toast("Uploading…");
      uploadFile(file).then(function (r) { onPick(r.url); toast("Image uploaded"); close(); }).catch(function (err) { toast(err.message, true); });
    });
  }

  /* ---------- media page ---------- */
  function renderMedia() {
    shell("media", '<div class="topline"><h1>Media library</h1></div>' + notices() +
      '<label class="drop" id="drop"><b>Drop images here</b> or click to upload<br><small>JPG, PNG or WebP. Large photos are resized automatically.</small><input type="file" accept="image/*" multiple hidden></label>' +
      '<div class="card"><h2>Uploaded images</h2>' + (S.media.length ? '<div class="mediagrid">' + S.media.map(function (x) {
        return '<div class="m" style="cursor:default"><div class="im" style="background-image:url(\'' + esc(x.url) + '\')"></div><span>' + esc(x.name) + '</span><div class="actions" style="justify-content:flex-start;padding:0 8px 8px"><button class="btn sm ghost" data-copy="' + esc(x.url) + '">Copy link</button><button class="btn sm danger" data-delimg="' + esc(x.url) + '">Delete</button></div></div>';
      }).join("") + "</div>" : '<p class="empty">No uploads yet.</p>') + "</div>" +
      '<div class="card" style="margin-top:16px"><h2>Website images</h2><p style="color:var(--muted)">Images that are part of the site design. You can use these in posts and pages too.</p><div class="mediagrid">' +
      SITE_IMAGES.map(function (x) { return '<div class="m" style="cursor:default"><div class="im" style="background-image:url(\'' + esc(x.url) + '\')"></div><span>' + esc(x.name) + "</span></div>"; }).join("") + "</div></div>");
    var drop = $("#drop"), input = $("input", drop);
    var handle = function (files) {
      files = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      toast("Uploading " + files.length + " image" + (files.length > 1 ? "s" : "") + "…");
      files.reduce(function (p, f) { return p.then(function () { return uploadFile(f); }); }, Promise.resolve())
        .then(function () { toast("Upload complete"); renderMedia(); }).catch(function (e) { toast(e.message, true); renderMedia(); });
    };
    input.addEventListener("change", function () { handle(input.files); });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { handle(e.dataTransfer.files); });
    $$("[data-copy]").forEach(function (b) { b.addEventListener("click", function () { var u = b.dataset.copy; if (u.startsWith("/")) u = location.origin + u; navigator.clipboard.writeText(u).then(function () { toast("Link copied"); }); }); });
    $$("[data-delimg]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this image? Any page using it will show a blank space.")) return;
        api("media", { method: "DELETE", query: "url=" + encodeURIComponent(b.dataset.delimg) }).then(function () {
          S.media = S.media.filter(function (x) { return x.url !== b.dataset.delimg; }); toast("Image deleted"); renderMedia();
        }).catch(function (e) { toast(e.message, true); });
      });
    });
  }

  /* ---------- help ---------- */
  function renderHelp() {
    shell("help", '<div class="topline"><h1>Help</h1></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
      '<div class="card"><h2>Write a blog post</h2><ol><li>Go to <b>Blog posts → New blog post</b>.</li><li>Add a title, short summary, topic and cover image.</li><li>Write in the <b>Text</b> section. Use H2/H3 for headings.</li><li>Add more sections if you like (image, checklist, quote, FAQs).</li><li>Set status to <b>Published</b> and click <b>Save</b>.</li></ol><p style="color:var(--muted)">New posts appear on the blog within about a minute.</p></div>' +
      '<div class="card"><h2>Create a page</h2><ol><li>Go to <b>Pages → New page</b>.</li><li>Fill in the page header (heading, intro, optional image and button).</li><li>Add sections: Text, Image + text, Checklist, Quote, FAQs, Call to action.</li><li>Use ↑ ↓ to reorder sections.</li><li>Publish and save. Then ask your web developer to add it to the menu if needed.</li></ol></div>' +
      '<div class="card"><h2>Enquiries</h2><p>Messages from the contact form arrive in <b>Enquiries</b>. Click one to read it, reply by email or call. Please delete enquiries you no longer need, as they contain personal information.</p></div>' +
      '<div class="card"><h2>Good practice</h2><ul><li>Always add an image description (alt text).</li><li>Keep the SEO title under 60 characters and the description under 160.</li><li>Use Draft to work on something before it goes live. Drafts can be previewed with <b>View</b> while you are logged in.</li></ul></div></div>');
  }

  /* ---------- save ---------- */
  function save(kind) {
    if (!doc.title.trim()) { toast("Please add a title.", true); return; }
    $$("#saveBtn,#saveBtn2").forEach(function (b) { b.disabled = true; });
    var body = JSON.parse(JSON.stringify(doc)); delete body._slugTouched;
    api(kind, { method: "POST", body: body }).then(function (r) {
      var i = S[kind].findIndex(function (x) { return x.id === r.item.id; });
      if (i >= 0) S[kind][i] = r.item; else S[kind].unshift(r.item);
      dirty = false;
      toast(r.item.status === "published" ? "Saved and live" : "Saved as draft");
      location.hash = "#/" + kind + "/" + r.item.id;
      if (decodeURIComponent(location.hash) === "#/" + kind + "/" + r.item.id) renderEditor(kind, r.item.id);
    }).catch(function (e) { toast(e.message, true); })
      .finally(function () { $$("#saveBtn,#saveBtn2").forEach(function (b) { b.disabled = false; }); });
  }

  /* ---------- routing ---------- */
  var lastHash = location.hash;
  function route() {
    if (!S.me || !S.me.authed) return renderLogin();
    var parts = (location.hash.replace(/^#\/?/, "") || "").split("/");
    var p = parts[0], id = parts[1];
    if (p === "inbox") return renderInbox(id);
    if (p === "posts" || p === "pages") return id ? renderEditor(p, id) : renderList(p);
    if (p === "media") return renderMedia();
    if (p === "help") return renderHelp();
    return renderDash();
  }
  window.addEventListener("hashchange", function () {
    if (dirty && !confirmLeave()) { history.replaceState(null, "", lastHash); return; }
    dirty = false; lastHash = location.hash; route();
  });
  function loadAll() {
    return Promise.all([api("posts"), api("pages"), api("submissions"), api("media").catch(function () { return { items: [] }; })])
      .then(function (r) { S.posts = r[0].items; S.pages = r[1].items; S.subs = r[2].items; S.media = r[3].items; });
  }
  fetch("/api/admin?action=me", { credentials: "same-origin" }).then(function (r) { return r.json(); })
    .then(function (me) { S.me = me; return me.authed ? loadAll() : null; })
    .then(route)
    .catch(function () { app.innerHTML = '<div class="boot">The admin could not connect to the server. It only works on the live (Vercel) site or the local dev server.</div>'; });
})();
