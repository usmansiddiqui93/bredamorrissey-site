#!/usr/bin/env python3
"""Turns the approved design artboards (_source/design/*.dc.html) into the live site.

Run after build.py:  python3 _source/build.py && python3 _source/build_live.py
- site/        static pages in the new design + site.css + main.js + CMS shell (blog/pages)
- preview/     the same pages with relative links for GitHub Pages
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGN = os.path.join(ROOT, "_source", "design")
SITE = os.path.join(ROOT, "site")
PREVIEW = os.path.join(ROOT, "preview")

BLOBS = {
  "37c73e664873fc38fff403ca7eb75610": "breda-morrissey-logo.svg",
  "622223bbf90474e350403cd94e58b7ed": "breda-morrissey-logo-white.svg",
  "cf5b37b4570693bee2d4b2357dcb633c": "breda-morrissey-counsellor.jpg",
  "3649efc97d84f87fad5607813230489b": "breda-morrissey-counsellor.jpg",
  "de516245883853070b649b4431fea524": "breda-morrissey-portrait-autumn.jpg",
  "b6c124c61c06291f77bdd22fe6033b3d": "breda-morrissey-avatar.jpg",
  "de07bcfab06761893ac982b60494436e": "apcp-accredited-member.jpg",
  "4e6777dd171a0e590a3fa168d9508723": "doctify-member-badge.png",
  "8497e567fd97e42f4cb283b1e7a1fb7b": "understanding-anxiety-cbt-cycle.webp",
  "251b240792a4a352bb42b2fe4c418b9f": "dementia-caregivers.jpg",
  "d804a661a6d271f043d1ad2082e174a5": "august-mental-health-reset.webp",
  "2fbb5baaa883ca67d98820f4ada4d583": "hidden-weight-of-caring.webp",
  "74fcb56c6e9a8c9f94ebea1ec287ee00": "how-to-stop-overthinking.webp",
  "d7b076129c30ead166a2f1563326f4c7": "january-gentle-start.webp",
  "8303e709e132974a0237305aa8525320": "christmas-calm.webp",
  "f3ae40d391781a748059f423d278452b": "september-fresh-start.webp",
  "29c55238a150f3f9cec1b01798e780ea": "exam-stress.webp",
  "c7731a4c625952d551014a72b389a219": "do-you-overthink.webp",
  "d23e2178fcaf3bd360ed13c7d598e1b6": "thoughts-notebook.webp",
}
# artboard -> (site file, clean url, preview file)
PAGES = {
  "Main": ("index.html", "/", "index.html"),
  "Anxiety": ("cbt-for-anxiety.html", "/cbt-for-anxiety", "cbt-for-anxiety.html"),
  "Stress": ("cbt-for-stress.html", "/cbt-for-stress", "cbt-for-stress.html"),
  "Services": ("services.html", "/services", "services.html"),
  "Faq": ("faq.html", "/faq", "faq.html"),
  "Contact": ("contact.html", "/contact", "contact.html"),
}
LINKS = {"Main.dc.html": "/", "Anxiety.dc.html": "/cbt-for-anxiety", "Stress.dc.html": "/cbt-for-stress",
         "Services.dc.html": "/services", "Faq.dc.html": "/faq", "Blog.dc.html": "/blog", "Contact.dc.html": "/contact",
         "Post.dc.html": "/blog/how-to-stop-overthinking"}
PREVIEW_LINKS = {"/": "index.html", "/cbt-for-anxiety": "cbt-for-anxiety.html", "/cbt-for-stress": "cbt-for-stress.html",
                 "/services": "services.html", "/faq": "faq.html", "/blog": "blog.html", "/contact": "contact.html"}

# Fee placeholders until Breda confirms them (edit here, then rebuild)
FEES = {"[PRICE OR FREE]": "On request", "[PRICE]": "On request", "[DURATION]": "50–60 minute"}

WA = '<a class="wa-float" href="https://wa.me/353838541298" target="_blank" rel="noopener" aria-label="Message Breda on WhatsApp" style="position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 90; width: 58px; height: 58px; border-radius: 50%; background: #25D366; display: grid; place-items: center; box-shadow: 0 8px 22px rgba(0,0,0,0.22)"><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" fill="#FFFFFF"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1 2.9 1.1 3.4.9 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg></a>'

def read(name):
    return open(os.path.join(DESIGN, name + ".dc.html"), encoding="utf-8").read()

def body_of(src):
    m = re.search(r"<x-dc>\s*<helmet>.*?</helmet>\s*(.*?)</x-dc>", src, re.S)
    return m.group(1).strip()

def css_of(src):
    return re.search(r"<helmet>.*?<style>(.*?)</style>", src, re.S).group(1)

def fix_common(html):
    for bid, f in BLOBS.items():
        html = html.replace(f"/_blob/{bid}", f"/images/{f}")
    for k, v in LINKS.items():
        html = html.replace(f'href="{k}"', f'href="{v}"')
    html = html.replace('href="#contact"', 'href="/contact"')
    html = re.sub(r'<link href="https://fonts\.googleapis\.com/css2\?family=Poppins[^"]*" rel="stylesheet">\s*', "", html)
    return html

def fix_home(html):
    html = html.replace('<a href="#help" style="grid-row: span 2;', '<a href="/cbt-for-anxiety" style="grid-row: span 2;')
    html = html.replace('<a href="#help" style="display: flex; flex-direction: column; background: #FFFFFF;', '<a href="/services" style="display: flex; flex-direction: column; background: #FFFFFF;')
    html = html.replace("My online counselling sessions cost [PRICE] for [DURATION].",
                        "Please get in touch for current fees. Sessions last 50 to 60 minutes.")
    html = html.replace('<span style="font-size: 56px; font-weight: 700; line-height: 1">[PRICE]</span>',
                        '<span style="font-size: 40px; font-weight: 700; line-height: 1.1">Fees on request</span>')
    html = html.replace("/ [DURATION] session", "· 50–60 minute sessions")
    for k, v in FEES.items():
        html = html.replace(k, v)
    return html

def fix_contact(html):
    html = html.replace('<form style="', '<form id="contact-form" action="/api/contact" method="POST" novalidate style="', 1)
    for f, nm in [("name", "name"), ("email", "email"), ("phone", "phone")]:
        html = html.replace(f'<input id="{f}" ', f'<input id="{f}" name="{nm}" ' + ("required " if f != "phone" else ""), 1)
    html = html.replace('<textarea id="message" ', '<textarea id="message" name="message" required ', 1)
    html = html.replace('<button type="submit"', '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px">\n        <button type="submit"', 1)
    html = html.replace("Send message</button>", 'Send message</button>\n        <div id="form-status" role="status" aria-live="polite" style="display: none; margin-top: 16px; padding: 14px 16px; border-radius: 12px; background: #F1E6EA; color: #4A2840"></div>', 1)
    return html

EXTRA_CSS = """
/* live-site additions */
.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;z-index:200;background:#fff;padding:10px 14px;border-radius:8px}
:focus-visible{outline:3px solid #93617F;outline-offset:3px}
.site-head{position:sticky;top:0;z-index:50}
details summary span[aria-hidden]{transition:background .2s,color .2s}
.article .tip-box{background:#F1E6EA;border-radius:22px;padding:26px 28px;margin:32px 0}
.article .refs{font-size:15px;color:#6D5D69;border-top:1px solid #E9DCE2;padding-top:20px;margin-top:40px}
.article .refs p{font-size:15px}
[data-filter-card][hidden]{display:none!important}
@media (max-width: 760px){
  .post-aside{position:static!important;max-height:none!important;overflow:visible!important}
  header.nav-open nav[aria-label="Main"]{display:flex!important;flex-direction:column;align-items:stretch!important;width:100%;order:3;padding:8px 0 4px}
  header.nav-open nav[aria-label="Main"] a{padding:13px 14px!important;border-radius:12px!important}
  header.nav-open a[style*="min-height: 48px"]{display:inline-flex!important;order:4;width:100%;justify-content:center}
}
"""

def head_from(old_html, css_href, mode):
    head = re.search(r"<head>(.*?)</head>", old_html, re.S).group(1)
    head = re.sub(r'<link rel="stylesheet" href="[^"]*style\.css">', f'<link rel="stylesheet" href="{css_href}">', head)
    head = head.replace("family=DM+Sans", "family=Poppins:wght@400;500;600;700&family=DM+Sans")
    return head

def wrap(head, body, js_href):
    return f'''<!DOCTYPE html>
<html lang="en-IE">
<head>{head}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{body}
{WA}
<script src="{js_href}" defer></script>
</body>
</html>
'''

def mark_regions(body):
    # header becomes sticky; main landmark wraps the page content between header and footer
    body = body.replace('<div style="background: #3A2034; color: #F8EEF2; font-size: 14px">', '<div class="site-top" style="background: #3A2034; color: #F8EEF2; font-size: 14px">', 1)
    body = body.replace('<header style="background: #FDFAFB; border-bottom: 1px solid #E9DCE2">', '<header class="site-head" style="background: #FDFAFB; border-bottom: 1px solid #E9DCE2">', 1)
    body = body.replace("</header>", '</header>\n<main id="main">', 1)
    i = body.find("<!-- FOOTER -->")
    if i == -1:
        i = body.find("<footer")
    body = body[:i] + "</main>\n  " + body[i:]
    return body

def to_preview(html):
    def link(m):
        url = m.group(1)
        if url in PREVIEW_LINKS:
            return f'href="{PREVIEW_LINKS[url]}"'
        if url.startswith("/blog/"):
            return f'href="{url[6:]}.html"'
        return m.group(0)
    html = re.sub(r'href="(/[^"#]*)"', link, html)
    html = html.replace('src="/images/', 'src="../site/images/').replace("url('/images/", "url('../site/images/")
    return html

def build():
    css = css_of(read("Anxiety")) + EXTRA_CSS
    os.makedirs(os.path.join(SITE, "assets"), exist_ok=True)
    open(os.path.join(SITE, "assets", "site.css"), "w").write(css.strip() + "\n")

    for name, (sfile, url, pfile) in PAGES.items():
        body = fix_common(body_of(read(name)))
        if name == "Main":
            body = fix_home(body)
        if name == "Contact":
            body = fix_contact(body)
        body = mark_regions(body)
        old_site = open(os.path.join(SITE, sfile)).read()
        old_prev = open(os.path.join(PREVIEW, pfile)).read()
        open(os.path.join(SITE, sfile), "w").write(wrap(head_from(old_site, "/assets/site.css", "site"), body, "/assets/main.js"))
        open(os.path.join(PREVIEW, pfile), "w").write(wrap(head_from(old_prev, "../site/assets/site.css", "preview"), to_preview(body), "../site/assets/main.js"))

    # 404 in the new layout
    main = mark_regions(fix_common(body_of(read("Faq"))))
    top = main[:main.find('<main id="main">') + len('<main id="main">')]
    top = top.replace(' aria-current="page"', "").replace("background: #F1E6EA; font-weight: 700; color: #4A2840", "color: #4A2840")
    foot = main[main.find("</main>"):]
    nf = f'''{top}
  <section style="padding: 120px 0; background: linear-gradient(180deg, #F1E6EA, #FDFAFB)"><div style="max-width: 760px; margin: 0 auto; padding: 0 32px; text-align: center">
    <h1 style="margin: 0 0 16px; font-family: 'DM Sans', Arial, sans-serif; font-weight: 500; font-size: 52px; color: #4A2840">Page not found</h1>
    <p style="margin: 0 0 32px; font-size: 19px; color: #5C3553">The page you’re looking for has moved or no longer exists.</p>
    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px"><a href="/" style="display: inline-flex; align-items: center; min-height: 52px; padding: 0 28px; border-radius: 999px; background: #7A4A6E; color: #FFFFFF; text-decoration: none; font-family: 'DM Sans', Arial, sans-serif; font-weight: 700">Go to the home page</a><a href="/contact" style="display: inline-flex; align-items: center; min-height: 52px; padding: 0 28px; border-radius: 999px; border: 1.5px solid #C99AAE; color: #4A2840; text-decoration: none; font-family: 'DM Sans', Arial, sans-serif; font-weight: 700">Get in touch</a></div>
  </div></section>
{foot}'''
    old404 = open(os.path.join(SITE, "404.html")).read()
    open(os.path.join(SITE, "404.html"), "w").write(wrap(head_from(old404, "/assets/site.css", "site"), nf, "/assets/main.js"))

    # CMS shell (blog + custom pages) in the new layout
    blog = mark_regions(fix_common(body_of(read("Blog"))))
    btop = blog[:blog.find('<main id="main">') + len('<main id="main">')]
    bfoot = blog[blog.find("</main>"):]
    shells = json.loads(open(os.path.join(SITE, "api", "_lib", "shell.js")).read().split("module.exports = ", 1)[1].rstrip().rstrip(";"))
    out = {}
    for kind in ("blog", "page"):
        old = shells[kind]
        head = re.search(r"<head>(.*?)</head>", old, re.S).group(1)
        css_links = '<link rel="stylesheet" href="/assets/site.css">' if kind == "blog" else '<link rel="stylesheet" href="/assets/style.css">\n<link rel="stylesheet" href="/assets/site.css">'
        head = re.sub(r'<link rel="stylesheet" href="[^"]*style\.css">', css_links, head)
        t = btop if kind == "blog" else btop.replace(' aria-current="page"', "").replace("background: #F1E6EA; font-weight: 700; color: #4A2840", "color: #4A2840")
        out[kind] = f'<!DOCTYPE html>\n<html lang="en-IE">\n<head>{head}</head>\n<body>\n<a class="skip" href="#main">Skip to content</a>\n{t}\n%%BODY%%\n{bfoot}\n{WA}\n<script src="/assets/main.js" defer></script>\n</body>\n</html>'
    open(os.path.join(SITE, "api", "_lib", "shell.js"), "w").write("// Generated by _source/build_live.py. Do not edit by hand.\nmodule.exports = " + json.dumps(out, ensure_ascii=False) + ";\n")

    # Preview copies of the blog (rendered by the CMS renderer with the seed posts)
    subprocess.run(["node", os.path.join(ROOT, "_source", "preview_blog.js")], check=True)
    seed = json.load(open(os.path.join(SITE, "api", "_lib", "seed.json")))
    for p in seed["posts"]:
        if p["status"] != "published":
            f = os.path.join(PREVIEW, p["slug"] + ".html")
            if os.path.exists(f): os.remove(f)
    print("Live build complete")

if __name__ == "__main__":
    build()
