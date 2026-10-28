#!/usr/bin/env python3
"""Builds the Breda Morrissey site.
   site/    -> deploy to Vercel (clean URLs identical to the current site)
   preview/ -> double-click locally to view (relative links)"""
import json, os, re, html, shutil, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
PREVIEW = os.path.join(ROOT, "preview")
DOMAIN = "https://www.bredamorrissey.com"
PHONE = "083 854 1298"
TEL = "+353838541298"
EMAIL = "bredamorrisseycounsellor@gmail.com"
WA = "https://wa.me/353838541298"
DOCTIFY = "https://www.doctify.com/ie/specialist/breda-morrissey-1"

# Images still hosted on her current Duda CDN (not included in the saved pages).
# Download these into /images before cancelling Duda; see README.
CDN = {
  "tile_cbt": "https://irp.cdn-website.com/md/pexels/dms3rep/multi/opt/pexels-photo-4065876-1920w.jpeg",
  "tile_counselling": "https://irp.cdn-website.com/20c5cf71/dms3rep/multi/opt/pexels-photo-3760280-96085762-1920w.jpeg",
  "tile_mindfulness": "https://irp.cdn-website.com/md/pexels/dms3rep/multi/opt/waterlily-pink-water-lily-water-plant-158465-1920w.jpeg",
  "contact_hero": "https://irp.cdn-website.com/20c5cf71/dms3rep/multi/opt/AdobeStock_361941612-2880w.jpeg",
  "anxiety_hero": "https://irp.cdn-website.com/20c5cf71/dms3rep/multi/opt/pexels-photo-830829-2880w.jpeg",
}

PAGES = {  # key: (site file, clean url, preview file)
  "home": ("index.html", "/", "index.html"),
  "anxiety": ("cbt-for-anxiety.html", "/cbt-for-anxiety", "cbt-for-anxiety.html"),
  "stress": ("cbt-for-stress.html", "/cbt-for-stress", "cbt-for-stress.html"),
  "services": ("services.html", "/services", "services.html"),
  "faq": ("faq.html", "/faq", "faq.html"),
  "contact": ("contact.html", "/contact", "contact.html"),
  "blog": ("blog.html", "/blog", "blog.html"),
  "404": ("404.html", "/404", "404.html"),
}

POSTS = [
  dict(slug="online-cbt-for-anxiety", old="online-cbt-for-anxiety", rel="anxiety", date="2026-10-14", title="Online CBT for Anxiety: How It Can Help You Feel More in Control",
       img="understanding-anxiety-cbt-cycle.webp", src=None,
       excerpt="How CBT works for anxiety, what happens in online sessions, and a small step you can try today.",
       desc="Online CBT therapy for anxiety: how it works, what to expect in online sessions and practical steps to manage worry and overthinking."),
  dict(slug="cbt-act-dementia-caregivers", old="supporting-dementia-caregivers-a-guide-to-cbt-and-act-therapies", rel="stress", date="2026-09-17", title="Supporting Dementia Caregivers: A Guide to CBT and ACT Therapies",
       img="dementia-caregivers.jpg", src="Supporting Dementia Caregivers_ A Guide to CBT and ACT Therapies.html",
       excerpt="Feeling overwhelmed, exhausted or guilty does not mean you are failing. It means you are human, and you deserve support too.",
       desc="How CBT and ACT can help dementia caregivers manage anxiety, guilt, anticipatory grief and burnout. Online support across Ireland."),
  dict(slug="august-mental-health-reset", old="the-august-reset-how-to-look-after-your-mental-health-before-september-arrives", rel="stress", date="2026-08-10", title="The August Reset: How to Look After Your Mental Health Before September Arrives",
       img="august-mental-health-reset.webp", src="August mental health reset, mental health and wellbeing Ireland, anxiety and stress Ireland, CBT Ireland, online counselling Ireland, managing anxiety, overthinking, stress management, self-care, ment.html",
       excerpt="Feeling like summer has passed too quickly? A gentle reset for anxiety, stress and overthinking before September.",
       desc="An August mental health reset: manage anxiety, stress and overthinking and prepare for September with greater calm and confidence."),
  dict(slug="carer-burnout-caring-for-others", old="the-hidden-weight-of-caring-for-others", rel="stress", date="2026-06-16", title="The Hidden Weight of Caring for Others",
       img="hidden-weight-of-caring.webp", src="The Hidden Weight of Caring for Others.html",
       excerpt="You spend your time caring for others. The signs of carer burnout and how to look after yourself too.",
       desc="The emotional and physical toll of caregiving, signs of carer burnout, and practical ways carers can look after their own wellbeing."),
  dict(slug="how-to-stop-overthinking", old="how-to-stop-overthinking", rel="anxiety", date="2026-03-25", title="How to Stop Overthinking Everything (Even When Your Mind Won't Switch Off)",
       img="how-to-stop-overthinking.webp", src="How to Stop Overthinking.html",
       excerpt="Why we overthink, why it keeps us stuck, and five gentle ways to step out of the loop.",
       desc="Why we overthink and five gentle, CBT-informed ways to quieten racing thoughts, even when your mind won't switch off."),
  dict(slug="january-without-pressure", old="january-without-the-pressure-cbt-counselling-support-for-a-gentler-start-to-the-year", rel="stress", date="2026-01-06", title="January Without the Pressure: CBT & Counselling Support for a Gentler Start to the Year",
       img="january-gentle-start.webp", src="January Without the Pressure_ CBT & Counselling Support for a Gentler Start to the Year.html",
       excerpt="A gentler approach to the new year, without resolutions that add pressure.",
       desc="A gentler start to the year: CBT and counselling support for January without the pressure.", placeholder=True),
  dict(slug="christmas-stress-finding-calm", old="finding-calm-in-the-christmas-season", rel="stress", date="2025-12-01", title="Finding Calm in the Christmas Season",
       img="christmas-calm.webp", src="Finding Calm in the Christmas Season.html",
       excerpt="It's okay if Christmas doesn't feel perfect. A little CBT wisdom for the holidays.",
       desc="Feeling the pressure at Christmas? CBT ideas to challenge the 'shoulds', create calm moments and choose connection over perfection."),
  dict(slug="september-reset-cbt-mindfulness", old="september-reset-with-breda-morrissey-embracing-cbt-mindfulness-counselling", rel="services", date="2025-08-22", title="September Reset: Embracing CBT, Mindfulness & Counselling",
       img="september-fresh-start.webp", src="September Reset with Breda Morrissey_ Embracing CBT, Mindfulness & Counselling.html",
       excerpt="Settling into a new season with CBT, mindfulness and counselling support.",
       desc="A September reset with CBT, mindfulness and counselling support from Breda Morrissey.", placeholder=True),
  dict(slug="coping-with-exam-stress", old="coping-with-exam-stress-supporting-a-loved-one-through-exams", rel="stress", date="2025-05-21", title="Coping with Exam Stress & Supporting a Loved One Through Exams",
       img="exam-stress.webp", src="Coping with Exam Stress & Supporting a Loved One Through Exams.html",
       excerpt="Practical ways to manage exam pressure, for students and the people supporting them.",
       desc="Tips to manage exam stress and how parents, partners and friends can support a loved one through exam season."),
  dict(slug="do-you-overthink", old="do-you-over-think", rel="anxiety", date="2025-04-29", title="Do You Overthink?",
       img="do-you-overthink.webp", src="Do you over think_.html",
       excerpt="What happens when we overthink, and some techniques to help.",
       desc="What happens when we overthink, how it affects anxiety, sleep and confidence, and simple techniques to break the cycle."),
]
for p in POSTS:
    PAGES["post:" + p["slug"]] = ("blog/" + p["slug"] + ".html", "/blog/" + p["slug"], p["slug"] + ".html")

# 301s from every URL on the current Duda site
REDIRECTS = [("/Anxiety/depression", "/cbt-for-anxiety"), ("/anxiety/depression", "/cbt-for-anxiety"),
             ("/empty-page", "/cbt-for-stress"), ("/home", "/")]
for p in POSTS:
    REDIRECTS.append(("/" + p["old"], "/blog/" + p["slug"]))

NAV = [("home", "Home"), ("anxiety", "CBT for Anxiety"), ("stress", "CBT for Stress"), ("services", "Services"),
       ("faq", "FAQ"), ("blog", "Blog"), ("contact", "Contact")]

E = html.escape
def fmt_date(iso):
    y, m, d = map(int, iso.split("-"))
    return date(y, m, d).strftime("%-d %B %Y")

class Ctx:
    def __init__(self, mode, key):
        self.mode, self.key = mode, key
    def link(self, key, anchor=""):
        site, clean, prev = PAGES[key]
        if self.mode == "site":
            return clean + anchor
        return prev + anchor
    def asset(self, path):  # path like "assets/style.css" or "images/x.jpg"
        return "/" + path if self.mode == "site" else "../site/" + path
    def img(self, name):
        return self.asset("images/" + name)

STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>'
def stars():
    return '<span class="dfy-stars" aria-hidden="true">' + STAR * 5 + "</span>"

def doctify_badge(c):
    return f'''<!-- DOCTIFY: replace this <a> with the "Average rating" widget embed code -->
<a class="doctify-badge" href="{DOCTIFY}" target="_blank" rel="noopener" aria-label="Rated 4.97 out of 5 from 10 patient reviews on Doctify">
  <span class="top">{stars()}<span class="score">4.97</span><span class="count">10 patient reviews</span></span>
  <span class="bottom">Verified by Doctify</span>
</a>'''

def doctify_review(c):
    return f'''<!-- DOCTIFY: replace this block with the "Average carousel rating" widget embed code -->
<div class="dfy-panel">
  <div class="dfy-band"><div>{stars()}<span class="score">4.97</span></div><div>Based on <b>10</b> reviews, verified by <b>Doctify</b></div></div>
  <div class="dfy-review">
    <div>
      <div class="dfy-person"><img src="{c.img('breda-morrissey-avatar.jpg')}" alt="" width="58" height="58" loading="lazy"><b>Breda Morrissey</b></div>
      <div class="dfy-cats"><span>Overall experience</span>{stars()}<span>Explanation</span>{stars()}<span>Bedside manner</span>{stars()}</div>
    </div>
    <div class="dfy-quote">
      <p class="meta"><span>Verified patient</span><span>05.06.2026</span></p>
      <blockquote>“I have had CBT with Breda over the last 12 months and I cannot speak highly enough of her. Breda’s calm and warm understanding helped me at a time when I needed it most…”</blockquote>
      <p style="margin:0">Patient seen for: <span class="dfy-pill">Anxiety</span></p>
      <p style="margin:1em 0 0"><a class="textlink" href="{DOCTIFY}" target="_blank" rel="noopener">Read all reviews on Doctify</a></p>
    </div>
  </div>
</div>'''

def doctify_category(c):
    return f'''<!-- DOCTIFY: replace this block with the "Average category rating" widget embed code -->
<div class="dfy-panel">
  <div class="dfy-band"><div>{stars()}<span class="score">4.97</span></div><div>10 reviews on <b>Doctify</b></div></div>
  <div style="padding:22px 28px"><div class="dfy-cats"><span>Overall experience</span>{stars()}<span>Explanation</span>{stars()}<span>Bedside manner</span>{stars()}</div></div>
</div>'''

ICON = {
  "phone": '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  "mail": '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  "wa": '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8 19z"/></svg>',
}
WA_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1 2.9 1.1 3.4.9 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>'

RIPPLE_HOME = '<svg class="ripple" viewBox="0 0 1000 1000" aria-hidden="true"><circle cx="500" cy="500" r="90"/><circle cx="500" cy="500" r="170"/><circle cx="500" cy="500" r="250"/><circle cx="500" cy="500" r="330"/><circle cx="500" cy="500" r="410"/><circle cx="500" cy="500" r="490"/></svg>'
RIPPLE = '<svg class="ripple" viewBox="0 0 1000 1000" aria-hidden="true"><circle cx="500" cy="500" r="120"/><circle cx="500" cy="500" r="220"/><circle cx="500" cy="500" r="320"/><circle cx="500" cy="500" r="420"/></svg>'


PT_MARK = '<span class="pt-mark">Psychology<br>Today<small>VERIFIED PROFILE</small></span>'
TRUST_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#7A4A6E" stroke-width="1.8" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/></svg>'
TOPIC = {"anxiety": "Anxiety & overthinking", "stress": "Stress & burnout", "services": "Wellbeing"}

def reading_time(p, extracted):
    if p["src"] is None:
        txt = ONLINE_CBT
    elif p.get("placeholder"):
        return 1
    else:
        txt = extracted[p["src"]]["body"]
    words = len(re.sub(r"<[^>]+>", " ", txt).split())
    return max(2, round(words / 220))

def accred_section(c):
    return f'''<section class="surface-blush">
  <div class="wrap">
    <div class="section-head center"><p class="kicker">Accredited &amp; trusted</p><h2>Qualified, accredited and independently reviewed</h2>
      <p class="muted">Breda is an accredited member of the Association of Professional Counsellors &amp; Psychotherapists in Ireland, with verified client reviews on Doctify.</p></div>
    <div class="accred">
      <a class="accred-card" href="https://www.apcp.ie/" target="_blank" rel="noopener">
        <div class="accred-logo"><img src="{c.img('apcp-accredited-member.jpg')}" alt="APCP logo" width="114" height="76" loading="lazy"></div>
        <strong>APCP accredited member</strong><span>Association of Professional Counsellors &amp; Psychotherapists in Ireland</span>
      </a>
      <a class="accred-card" href="{DOCTIFY}" target="_blank" rel="noopener">
        <div class="accred-logo"><img src="{c.img('doctify-member-badge.png')}" alt="Verified on Doctify" width="143" height="76" loading="lazy"></div>
        <strong>Verified on Doctify</strong><span>Independently verified patient reviews</span>
      </a>
      <a class="accred-card" href="{DOCTIFY}" target="_blank" rel="noopener">
        <div class="accred-logo"><span class="score-mark">4.97{stars()}</span></div>
        <strong>Rated 4.97 out of 5</strong><span>From 10 verified client reviews</span>
      </a>
      <a class="accred-card" href="https://www.psychologytoday.com/profile/938012" target="_blank" rel="noopener">
        <div class="accred-logo">{PT_MARK}</div>
        <strong>Psychology Today</strong><span>Listed therapist profile</span>
      </a>
    </div>
  </div>
</section>'''


ICO = {
  "thoughts": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3.5a3.5 3.5 0 0 0-3.4 2.7A3.3 3.3 0 0 0 4 9.3a3.3 3.3 0 0 0 .9 2.3 3.4 3.4 0 0 0 1.6 5.4A3.2 3.2 0 0 0 9.5 20.5c.9 0 1.7-.3 2.5-.9V4.4a3.5 3.5 0 0 0-2.5-.9zM14.5 3.5a3.5 3.5 0 0 1 3.4 2.7A3.3 3.3 0 0 1 20 9.3a3.3 3.3 0 0 1-.9 2.3 3.4 3.4 0 0 1-1.6 5.4 3.2 3.2 0 0 1-3 3.5c-.9 0-1.7-.3-2.5-.9"/></svg>',
  "feelings": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/></svg>',
  "behaviours": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.2"/><path d="M5.5 20.5c.6-4 3.2-6.5 6.5-6.5s5.9 2.5 6.5 6.5"/></svg>',
  "spiral": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.8"/></svg>',
  "leaf": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/></svg>',
  "sun": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>',
  "mind": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 20.5v-3h2a2 2 0 0 0 2-2v-2.3l1.6-.7-1.6-3.2A7 7 0 1 0 8 15.6v4.9"/><path d="M11.8 7.2a2.6 2.6 0 1 1 0 5.2 1.3 1.3 0 0 1 0-2.6"/></svg>',
}

def cbt_cycle(c):
    nodes = [
      ("n1", "thoughts", "1", "Thoughts", "Worrying, negative thinking, “what if?” thoughts."),
      ("n2", "feelings", "2", "Feelings", "Anxiety, fear, overwhelm, unease."),
      ("n3", "behaviours", "3", "Behaviours", "Avoiding situations, seeking reassurance, withdrawing."),
      ("n4", "spiral", "4", "More anxiety", "The cycle continues and anxiety grows."),
    ]
    items = "".join(f'''<li class="cycle-node {cls}"><span class="cycle-ic">{ICO[ic]}</span><h3><span class="num">{n}</span>{t}</h3><p>{d}</p></li>''' for cls, ic, n, t, d in nodes)
    return f'''<section class="surface-blush cycle-section" aria-labelledby="cbt-cycle-title">
  <div class="wrap">
    <div class="section-head center">
      <p class="kicker">Understanding anxiety</p>
      <h2 id="cbt-cycle-title">The CBT cycle</h2>
      <p class="muted">Anxiety can create a cycle, but change is possible.</p>
    </div>
    <div class="cycle-layout">
      <div class="card cycle-side">
        <span class="cycle-ic small">{ICO["leaf"]}</span>
        <h3>CBT can help you</h3>
        <ul class="ticks">
          <li>Understand your thoughts</li><li>Reduce worry and fear</li><li>Change unhelpful patterns</li>
          <li>Build confidence and coping skills</li><li>Feel more calm, clear and in control</li>
        </ul>
      </div>
      <div class="cycle">
        <svg class="cycle-ring" viewBox="0 0 400 400" aria-hidden="true">
          <defs><marker id="cyc-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L8 5 L1 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
          <circle cx="200" cy="200" r="168" class="track"/>
          <path d="M278.9 51.7 A168 168 0 0 1 348.3 121.1" marker-end="url(#cyc-arrow)"/><path d="M348.3 278.9 A168 168 0 0 1 278.9 348.3" marker-end="url(#cyc-arrow)"/><path d="M121.1 348.3 A168 168 0 0 1 51.7 278.9" marker-end="url(#cyc-arrow)"/><path d="M51.7 121.1 A168 168 0 0 1 121.1 51.7" marker-end="url(#cyc-arrow)"/>
        </svg>
        <ol class="cycle-nodes">{items}</ol>
        <div class="cycle-core"><span>{ICO["leaf"]}</span><p>CBT helps you break the cycle and take back control.</p></div>
      </div>
      <div class="cycle-side cycle-reassure">
        <p class="big">You don’t have to face anxiety on your own.</p>
        <p class="muted">Support is here, and things can get better.</p>
        <a class="btn btn-primary" href="{c.link('contact')}">Book an initial consultation</a>
      </div>
    </div>
  </div>
</section>'''

STONES_SVG = '''<svg class="sc-art" viewBox="28 18 250 214" aria-hidden="true">
  <defs>
    <radialGradient id="st1" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#93617F"/><stop offset="1" stop-color="#4A2840"/></radialGradient>
    <radialGradient id="st2" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#E6D2DA"/><stop offset="1" stop-color="#B98BA0"/></radialGradient>
    <radialGradient id="st3" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E2CCD6"/></radialGradient>
  </defs>
  <g fill="none" stroke="#93617F" stroke-width="2" stroke-linecap="round">
    <path d="M210 205 C205 150 215 100 245 40"/>
    <path d="M222 140 C240 128 252 112 258 92"/>
  </g>
  <g fill="#C99AAE">
    <ellipse cx="246" cy="44" rx="9" ry="17" transform="rotate(30 246 44)"/>
    <ellipse cx="231" cy="70" rx="8" ry="15" transform="rotate(-40 231 70)" fill="#93617F" opacity=".75"/>
    <ellipse cx="240" cy="86" rx="8" ry="15" transform="rotate(50 240 86)"/>
    <ellipse cx="216" cy="110" rx="8" ry="15" transform="rotate(-50 216 110)" fill="#93617F" opacity=".75"/>
    <ellipse cx="258" cy="95" rx="7" ry="13" transform="rotate(25 258 95)" fill="#93617F" opacity=".6"/>
    <ellipse cx="229" cy="132" rx="7" ry="13" transform="rotate(55 229 132)"/>
  </g>
  <ellipse cx="128" cy="214" rx="96" ry="10" fill="#4A2840" opacity=".12"/>
  <ellipse cx="128" cy="190" rx="82" ry="27" fill="url(#st1)"/>
  <ellipse cx="124" cy="150" rx="64" ry="22" fill="url(#st2)"/>
  <ellipse cx="130" cy="117" rx="44" ry="17" fill="url(#st3)"/>
</svg>'''

def stress_card(c):
    pillars = [("mind", "Understand your thoughts"), ("leaf", "Develop healthy coping strategies"),
               ("feelings", "Reduce stress and overwhelm"), ("sun", "Build resilience and feel more in control")]
    li = "".join(f'<li><span class="cycle-ic small">{ICO[i]}</span><span>{t}</span></li>' for i, t in pillars)
    return f'''<div class="stress-card">
  <div class="sc-top">
    <div class="sc-body">
      <p class="sc-eyebrow">CBT</p>
      <p class="sc-title">Working with stress</p>
      <p class="sc-text">Practical tools to manage overwhelm, reduce worry and feel more in control of your life.</p>
    </div>
    {STONES_SVG}
  </div>
  <ul class="sc-pillars">{li}</ul>
</div>'''

def layout(c, title, desc, body, schema=None, og_image="breda-morrissey-counsellor.jpg", noindex=False):
    key = c.key
    canon = DOMAIN + PAGES[key][1]
    nav_items = []
    for k, label in NAV:
        cur = k == key or (key.startswith("post:") and k == "blog")
        nav_items.append(f'<li><a href="{c.link(k)}"{" aria-current=\"page\"" if cur else ""}>{label}</a></li>')
    schemas = [] if not schema else (schema if isinstance(schema, list) else [schema])
    if key not in ("home", "404"):
        trail = [("Home", DOMAIN + "/")]
        if key.startswith("post:"):
            post = next(p for p in POSTS if "post:" + p["slug"] == key)
            trail += [("Blog", DOMAIN + "/blog"), (post["title"], canon)]
        else:
            trail.append((dict(NAV).get(key, title), canon))
        schemas.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(trail)]})
    schema_tag = "".join('<script type="application/ld+json">' + json.dumps(s_, ensure_ascii=False) + "</script>" for s_ in schemas)
    robots = '<meta name="robots" content="noindex">\n' if noindex else ""
    return f'''<!DOCTYPE html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{canon}">
{robots}<meta name="theme-color" content="#3A2034">
<meta property="og:type" content="{"article" if key.startswith("post:") else "website"}">
<meta property="og:site_name" content="Breda Morrissey Counselling &amp; CBT">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{DOMAIN}/images/{og_image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{c.img('favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Open+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{c.asset('assets/style.css')}">
{schema_tag}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="topbar"><div class="wrap">
    <span class="tagline">Online counselling &amp; CBT across Ireland and the UK</span>
    <span class="links"><a href="tel:{TEL}">{PHONE}</a><a href="mailto:{EMAIL}">{EMAIL}</a></span>
  </div></div>
  <div class="wrap nav">
    <a class="brand" href="{c.link('home')}"><img src="{c.img('breda-morrissey-logo.svg')}" alt="Breda Morrissey Counselling &amp; CBT" width="403" height="120"></a>
    <button class="menu-toggle" aria-expanded="false" aria-controls="menu">Menu</button>
    <ul class="menu" id="menu">{"".join(nav_items)}</ul>
    <a class="btn btn-primary btn-book" href="{c.link('contact')}">Book a consultation</a>
  </div>
</header>
<main id="main">
{body}
</main>
{cta(c) if key not in ("contact", "404") else ""}
<footer class="site-foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="foot-logo" href="{c.link('home')}"><img src="{c.img('breda-morrissey-logo-white.svg')}" alt="Breda Morrissey Counselling &amp; CBT" width="208" height="62" loading="lazy"></a>
        <p style="margin-top:16px;max-width:42ch;opacity:.9">Breda Morrissey BA (Hons) APCP. Online Cognitive Behavioural Therapy (CBT), Counselling &amp; Psychotherapy, and Mindfulness. Cork, Limerick, Tipperary and nationwide, Ireland.</p>
        <div class="foot-accred">
          <a href="https://www.apcp.ie/" target="_blank" rel="noopener" aria-label="APCP accredited member"><img src="{c.img('apcp-accredited-member.jpg')}" alt="APCP" width="69" height="46" loading="lazy"></a>
          <a href="{DOCTIFY}" target="_blank" rel="noopener" aria-label="Verified on Doctify"><img src="{c.img('doctify-member-badge.png')}" alt="Doctify" width="87" height="46" loading="lazy"></a>
          <a href="https://www.psychologytoday.com/profile/938012" target="_blank" rel="noopener" aria-label="Psychology Today profile">{PT_MARK}</a>
        </div>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="tel:{TEL}">{PHONE}</a></li>
          <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
          <li><a href="{WA}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li style="opacity:.85">Mon–Thu 7am–7pm, Fri 7am–6pm</li>
        </ul>
      </div>
      <div>
        <h4>Pages</h4>
        <ul>
          <li><a href="{c.link('home')}">Home</a></li>
          <li><a href="{c.link('anxiety')}">CBT for anxiety</a></li>
          <li><a href="{c.link('stress')}">CBT for stress</a></li>
          <li><a href="{c.link('services')}">Services</a></li>
          <li><a href="{c.link('faq')}">FAQ</a></li>
          <li><a href="{c.link('blog')}">Blog</a></li>
          <li><a href="{c.link('contact')}">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-base"><span>© {date.today().year} Breda Morrissey</span><span>If you are in crisis, contact emergency services on 112 or 999.</span></div>
  </div>
</footer>
<a class="wa" href="{WA}" target="_blank" rel="noopener" aria-label="Message Breda on WhatsApp">{WA_SVG}</a>
<script src="{c.asset('assets/main.js')}" defer></script>
</body>
</html>'''

def cta(c):
    return f'''<section class="surface-dark cta-band">
  {RIPPLE}
  <div class="wrap">
    <div>
      <h2>Ready to take the next step?</h2>
      <p>If you’re feeling ready, I’d be very happy to hear from you. Get in touch to ask a question or arrange an initial appointment. You don’t have to have everything figured out. Just starting the conversation is enough.</p>
    </div>
    <div class="btn-row" style="margin-top:0">
      <a class="btn btn-primary" href="{c.link('contact')}">Book a consultation</a>
      <a class="btn btn-ghost" href="tel:{TEL}">{PHONE}</a>
    </div>
  </div>
</section>'''

def crumbs(c, label, parent=None):
    mid = f' / <a href="{c.link(parent[0])}">{parent[1]}</a>' if parent else ""
    return f'<p class="crumb"><a href="{c.link("home")}">Home</a>{mid} / {label}</p>'

def page_hero(c, label, h1, lead, extra="", surface="surface-soft"):
    return f'''<section class="page-hero {surface}">
  {RIPPLE}
  <div class="wrap">
    {crumbs(c, label)}
    <h1>{h1}</h1>
    <p class="lead">{lead}</p>
    {extra}
  </div>
</section>'''

# ---------------- PAGES ----------------
def page_home(c):
    body = f'''
<section class="hero">
  {RIPPLE_HOME}
  <div class="wrap hero-grid">
    <div>
      <p class="kicker">Feeling anxious, overwhelmed or stuck in your thoughts?</p>
      <h1>Online CBT for anxiety, overthinking &amp; low self-esteem</h1>
      <p class="lead">Overthinking, low confidence and anxiety can make everyday life feel exhausting. I’m here to help you feel like yourself again.</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="{c.link('contact')}">Book a consultation</a>
        <a class="btn btn-ghost" href="tel:{TEL}">Call {PHONE}</a>
      </div>
      <div class="hero-trust">
        <span>{TRUST_ICON}Accredited member, APCP</span>
        <span>{TRUST_ICON}Rated 4.97 on Doctify</span>
        <span>{TRUST_ICON}Online across Ireland &amp; the UK</span>
      </div>
    </div>
    <figure class="portrait">
      <div class="frame"><img src="{c.img('breda-morrissey-counsellor.jpg')}" alt="Breda Morrissey, accredited counsellor and CBT psychotherapist" width="421" height="590" fetchpriority="high"></div>
      <figcaption><strong>Breda Morrissey</strong>Accredited counsellor &amp; psychotherapist, BA (Hons) APCP</figcaption>
      {doctify_badge(c)}
    </figure>
  </div>
</section>

<section class="surface-soft">
  <div class="wrap split top">
    <div><h2>Whatever brought you here, you don’t have to keep carrying it alone</h2></div>
    <div class="measure">
      <p>Do you find yourself overthinking everything, constantly worrying, or feeling stuck in your own mind? Maybe your confidence has taken a knock, or you’re carrying experiences that have left you feeling like you’re not quite good enough.</p>
      <p>I’m Breda Morrissey, an accredited counsellor and psychotherapist specialising in CBT, counselling and mindfulness. I provide warm, confidential online counselling for adults across Ireland, helping you understand what you’re experiencing, develop practical coping strategies and feel more confident in yourself and your life.</p>
      <p>All from the comfort of your own home.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap split">
    <div>
      <p class="kicker">How I can help</p>
      <h2>Support for the things that weigh on you</h2>
      <p class="lead">I support people who are struggling with:</p>
      <ul class="ticks">
        <li>Anxiety and constant worry</li>
        <li>Overthinking and racing thoughts</li>
        <li>Low self-esteem and lack of confidence</li>
        <li>Feeling stuck, lost, or unsure about life</li>
        <li>Emotional impact of illness, including cancer</li>
        <li>Fertility challenges, including IVF and loss</li>
        <li>Stress, overwhelm, and burnout</li>
      </ul>
      <p class="muted" style="margin-top:1.4rem">You might not have the “right words” for how you feel, and that’s okay. We can figure it out together.</p>
    </div>
    <div class="media arch"><img src="{c.img('january-gentle-start.webp')}" alt="" width="1600" height="1001" loading="lazy"></div>
  </div>
</section>

<section class="surface-dark">
  <div class="wrap split top">
    <div>
      <h2>A safe, supportive space to talk</h2>
      <p>I offer a calm, confidential space where you can talk openly, feel heard, and begin to make sense of what’s going on for you.</p>
      <p>Together, we can gently explore what’s been weighing on you and help you find ways to feel more in control, more confident, and more like yourself again.</p>
    </div>
    <div>
      <h3>How we’ll work together</h3>
      <p>I draw on a combination of counselling and Cognitive Behavioural Therapy (CBT), always tailored to you as an individual. There’s no one-size-fits-all approach. Our work together will move at a pace that feels right for you.</p>
      <p>This is your space to talk freely, without judgement or pressure.</p>
    </div>
  </div>
</section>

<section style="padding-bottom:0">
  <div class="wrap">{doctify_review(c)}</div>
</section>

<section>
  <div class="wrap">
    <div class="split top">
      <div>
        <h2>Rebuilding confidence &amp; moving forward</h2>
        <p class="statement">Confidence doesn’t come from “thinking positively”. It comes from learning to trust yourself again.</p>
      </div>
      <div>
        <p class="lead">Through our work together, we can help you:</p>
        <ul class="ticks">
          <li>Understand and manage overthinking</li>
          <li>Develop healthier ways of coping with anxiety</li>
          <li>Build self-confidence and self-worth</li>
          <li>Process difficult past experiences</li>
          <li>Feel calmer, clearer, and more in control</li>
        </ul>
        <p class="muted" style="margin-top:1.4rem">Small changes can make a big difference over time.</p>
      </div>
    </div>
    <div class="section-head" style="margin-top:clamp(56px,7vw,96px)"><p class="kicker">Ways we can work together</p><h2>Therapies tailored to you</h2></div>
    <div class="trio">
      <a href="{c.link('services', '#cognitive-behavioural-therapy')}">
        <div class="thumb"><img src="{CDN['tile_cbt']}" alt="" loading="lazy"></div>
        <div class="txt"><h3>Cognitive Behavioural Therapy</h3><p>Understand how your thoughts, feelings and actions connect, and learn practical ways to break unhelpful cycles.</p><span class="more">About CBT</span></div>
      </a>
      <a href="{c.link('services', '#counselling-psychotherapy')}">
        <div class="thumb"><img src="{CDN['tile_counselling']}" alt="" loading="lazy"></div>
        <div class="txt"><h3>Counselling &amp; Psychotherapy</h3><p>A confidential, non-judgemental space to explore personal issues, emotional pain or something that has happened in your life.</p><span class="more">About counselling</span></div>
      </a>
      <a href="{c.link('services', '#mindfulness')}">
        <div class="thumb"><img src="{CDN['tile_mindfulness']}" alt="" loading="lazy"></div>
        <div class="txt"><h3>Mindfulness</h3><p>Learn to observe your thoughts without judgement and develop a more compassionate inner voice.</p><span class="more">About mindfulness</span></div>
      </a>
    </div>
  </div>
</section>

<section class="surface-soft">
  <div class="wrap split top">
    <div>
      <p class="kicker">About me</p>
      <h2>A warm, qualified and accredited counsellor</h2>
      <p>I am a qualified and accredited counsellor with experience supporting people through anxiety, depression, trauma, and life’s more challenging experiences.</p>
      <p>I have a particular interest in helping those who feel overwhelmed, stuck, or who have lost confidence in themselves, especially after difficult life events such as illness, loss or anxiety struggles.</p>
      <p>I aim to provide a space where you feel comfortable, respected, and genuinely supported.</p>

    </div>
    <div>
      <div class="card"><h3>Qualifications</h3>
      <ul class="creds">
        <li>Postgraduate Diploma in Cognitive Behavioural Therapy</li>
        <li>BA (Hons) in Counselling &amp; Psychotherapy</li>
        <li>BA Counselling Skills &amp; Psychotherapy Studies</li>
        <li>Diploma in Positive Psychology</li>
        <li>Cert. REBT (Rational Emotive Behaviour Therapy) practitioner</li>
        <li>Diploma in Human Resource Development</li>
        <li>BSc Science, Health, Fitness &amp; Leisure</li>
      </ul></div>
    </div>
  </div>
</section>

{accred_section(c)}

<section>
  <div class="wrap split top">
    <div>
      <h2>What to expect</h2>
      <p>Starting therapy can feel like a big step, especially if you’ve never done it before.</p>
      <p>In our first session, we’ll take things gently. We’ll talk about what’s been going on for you, what you’d like support with, and answer any questions you may have.</p>
      <p>There’s no pressure, just a chance to begin.</p>
    </div>
    <div>
      <h2>Online counselling, Ireland &amp; UK</h2>
      <p>All sessions are held online, making therapy accessible wherever you are. I work with clients across:</p>
      <ul class="chips"><li>Dublin</li><li>Cork</li><li>Galway</li><li>Limerick</li><li>Tipperary</li><li>Nationwide</li><li>United Kingdom</li></ul>
    </div>
  </div>
  <div class="wrap">
    <div class="hl-box" style="margin-top:clamp(40px,6vw,72px)">
      <h3>Not sure what to expect from therapy?</h3>
      <p class="measure">That’s okay. Find some answers here that can help reassure you about seeking counselling. If they don’t help, just get in touch and I can support you through this process.</p>
      <div class="reassure">
        <a href="{c.link('services', '#what-to-expect')}">What to expect <span aria-hidden="true">+</span></a>
        <a href="{c.link('faq')}">Frequently asked questions <span aria-hidden="true">+</span></a>
        <a href="{c.link('contact')}">Get support <span aria-hidden="true">+</span></a>
      </div>
    </div>
  </div>
</section>'''
    schema = {
      "@context": "https://schema.org", "@type": "ProfessionalService",
      "name": "Breda Morrissey Counselling & CBT", "url": DOMAIN + "/",
      "image": DOMAIN + "/images/breda-morrissey-counsellor.jpg", "logo": DOMAIN + "/images/breda-morrissey-logo.svg",
      "telephone": TEL, "email": EMAIL, "priceRange": "Contact for fees",
      "description": "Online counselling and CBT for anxiety, overthinking, stress and low self-esteem for adults across Ireland and the UK.",
      "areaServed": [{"@type": "Country", "name": "Ireland"}, {"@type": "Country", "name": "United Kingdom"}],
      "address": {"@type": "PostalAddress", "addressCountry": "IE"},
      "openingHoursSpecification": [
        {"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday"], "opens": "07:00", "closes": "19:00"},
        {"@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "07:00", "closes": "18:00"}],
      "sameAs": [DOCTIFY, "https://www.psychologytoday.com/profile/938012"],
      "founder": {"@type": "Person", "name": "Breda Morrissey", "jobTitle": "Accredited Counsellor and Psychotherapist",
                  "hasCredential": "BA (Hons) Counselling & Psychotherapy; Postgraduate Diploma in CBT",
                  "memberOf": {"@type": "Organization", "name": "APCP", "url": "https://www.apcp.ie/"}}}
    return layout(c, "Online Counselling Ireland | Anxiety, Stress & Self-Esteem | Breda Morrissey",
                  "Online counselling for anxiety, overthinking, and low self-esteem. Supporting clients across Ireland and the UK. Safe, confidential, and compassionate therapy.",
                  body, schema)

def page_anxiety(c):
    hero = page_hero(c, "CBT for anxiety", "Counselling &amp; CBT for anxiety, worry and overthinking",
        "Online CBT therapy for anxiety, panic and overthinking. Compassionate, practical support for adults across Ireland.",
        f'<div class="btn-row"><a class="btn btn-primary" href="{c.link("contact")}">Book an initial consultation</a></div>')
    body = hero + f'''
<section>
  <div class="wrap split top">
    <div>
      <p class="kicker">You’re not alone</p>
      <h2>Do you feel anxious most of the time?</h2>
    </div>
    <div class="measure">
      <p class="lead">You may be experiencing constant worry, racing thoughts, overthinking, difficulty relaxing or feeling on edge.</p>
      <p>Anxiety can affect your confidence, relationships and everyday life. <strong>The good news is that anxiety is highly treatable, and CBT can help you regain a sense of calm and control.</strong></p>
    </div>
  </div>
</section>

{cbt_cycle(c)}

<section class="surface-soft">
  <div class="wrap split top">
    <div><h2>How anxiety affects everyday life</h2></div>
    <div class="measure">
      <p>Anxiety can affect your entire life, sneaking into your daily routines to impact your mental, physical and emotional wellbeing. It frequently causes difficulty concentrating, persistent worry about worst-case scenarios, and avoidance behaviours that can cause you to miss out on new experiences.</p>
      <p>CBT aims to stop negative cycles such as these by breaking down things that make you feel bad, anxious or scared. By making your problems more manageable, CBT can help you change your negative thought patterns and improve the way you feel.</p>
      <p>CBT can help you get to a point where you can achieve this on your own and tackle problems without the help of a therapist.</p>
    </div>
  </div>
</section>

<section class="surface-dark">
  <div class="wrap split">
    <div>
      <h2>How can CBT help?</h2>
      <p>CBT helps you understand the connection between your thoughts, feelings and behaviours. Together we can:</p>
    </div>
    <ul class="ticks">
      <li>Reduce excessive worry</li><li>Manage anxious thoughts</li><li>Build confidence</li><li>Learn practical coping skills</li><li>Break the cycle of overthinking</li>
    </ul>
  </div>
</section>

<section>
  <div class="wrap split top">
    <div>
      <h2>Questions about anxiety therapy</h2>
      <div class="faq">
        <details open><summary>Can CBT help anxiety?</summary><div class="answer">Yes. CBT is one of the most effective therapies for anxiety.</div></details>
        <details><summary>Do you offer online sessions?</summary><div class="answer">Yes. I provide online CBT therapy across Ireland.</div></details>
        <details><summary>How many sessions will I need?</summary><div class="answer">This varies depending on your needs and goals.</div></details>
      </div>
    </div>
    <div>{doctify_category(c)}</div>
  </div>
</section>

<section class="surface-blush">
  <div class="wrap split top">
    <div>
      <h2>Counselling for bereavement, grief &amp; loss</h2>
      <p class="lead">There are many types of loss: loss of a job, the end of a relationship, the loss of health, the death of a loved one, a pet.</p>
    </div>
    <div class="measure">
      <p>The death of a loved one can be the biggest loss in our lives.</p>
      <p>Bereavement and loss affect people in different ways, but most people experience grief in some way. Grief includes the deep sadness after a death or loss. It is a natural process as we learn how to live without the person who has died. Sometimes we need help.</p>
      <p><a class="textlink" href="https://www2.hse.ie/mental-health/life-situations-events/bereavement/coping-with-grief/" target="_blank" rel="noopener">Coping with grief after bereavement or loss (HSE.ie)</a></p>
      <div class="btn-row"><a class="btn btn-primary" href="{c.link('contact')}">Talk to me about grief support</a></div>
    </div>
  </div>
</section>''' + related_posts(c, "anxiety")
    return layout(c, "Anxiety Therapy Online Ireland | CBT for Anxiety | Breda Morrissey",
                  "Online CBT therapy for anxiety, panic, and overthinking. Compassionate, practical support for adults across Ireland. Free consultation available",
                  body, og_image="understanding-anxiety-cbt-cycle.webp")

def page_stress(c):
    body = f'''
<section class="page-hero">
  {RIPPLE}
  <div class="wrap hero-split">
    <div>
      {crumbs(c, "CBT for stress")}
      <p class="kicker">Online CBT for stress</p>
      <h1>Feeling overwhelmed, stressed or unable to switch off?</h1>
      <p class="lead">Stress is a normal part of life, but when it becomes constant, it can affect your physical health, emotional wellbeing, relationships and quality of life.</p>
      <p>I offer online CBT therapy for adults across Ireland who are struggling with stress, overwhelm and burnout.</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="{c.link('contact')}">Book a consultation</a>
        <a class="btn btn-ghost" href="tel:{TEL}">Call {PHONE}</a>
      </div>
    </div>
    {stress_card(c)}
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split top" style="margin-bottom:clamp(32px,4vw,48px)">
      <div><p class="kicker">Recognising stress</p><h2>What does stress feel like?</h2></div>
      <p class="lead" style="margin:0">You may find yourself feeling overwhelmed, irritable, exhausted, unable to relax or constantly worrying about what needs to be done next. If stress is taking over your life, CBT can help.</p>
    </div>
    <div class="card">
      <p style="font-weight:700;color:var(--plum-800)">Stress affects everyone differently, but common signs include:</p>
      <ul class="ticks cols-3"><li>Constant worry</li><li>Feeling overwhelmed</li><li>Racing thoughts</li><li>Difficulty switching off</li><li>Trouble sleeping</li><li>Feeling irritable or emotional</li><li>Muscle tension</li><li>Headaches</li><li>Low motivation</li><li>Exhausted even after resting</li></ul>
      <p class="muted" style="margin:1.6rem 0 0">Many people continue pushing through stress without realising the impact it is having on their wellbeing.</p>
    </div>
  </div>
</section>

<section class="surface-soft">
  <div class="wrap split top">
    <div>
      <h2>When stress becomes too much</h2>
      <p>Stress can develop gradually. You may have become so used to feeling busy and overwhelmed that it now feels normal.</p>
      <p>Over time, prolonged stress can lead to anxiety, burnout and reduced confidence.</p>
    </div>
    <div>
      <p class="lead">You might find yourself:</p>
      <ul class="ticks"><li>Constantly thinking about work</li><li>Struggling to relax at weekends</li><li>Feeling guilty when resting</li><li>Overthinking decisions</li><li>Becoming impatient with loved ones</li><li>Feeling emotionally drained</li></ul>
    </div>
  </div>
</section>

<section class="surface-dark">
  <div class="wrap split top">
    <div>
      <h2>How CBT can help with stress</h2>
      <p>Cognitive Behavioural Therapy (CBT) is a practical, evidence-based approach that helps you understand the connection between your thoughts, feelings and behaviours.</p>
      <p>Rather than simply managing symptoms, CBT helps address the patterns that keep stress going.</p>
    </div>
    <ul class="ticks"><li>Manage stress more effectively</li><li>Reduce excessive worry</li><li>Learn healthy coping strategies</li><li>Improve work-life balance</li><li>Challenge unhelpful thinking patterns</li><li>Build resilience and confidence</li><li>Prevent burnout</li></ul>
  </div>
</section>

<section>
  <div class="wrap">
    <h2>Stress, anxiety and burnout</h2>
    <p class="lead measure">Many people are unsure whether they are experiencing stress, anxiety or burnout. Although these experiences can overlap, understanding the difference can be helpful.</p>
    <div class="compare">
      <div><h3>Stress</h3><p>Often linked to external pressures such as work, family responsibilities, financial concerns or major life changes.</p></div>
      <div><h3>Anxiety</h3><p>May continue even when the stressful situation has passed.</p></div>
      <div><h3>Burnout</h3><p>Often develops after prolonged periods of stress and can leave you feeling emotionally exhausted and disconnected.</p></div>
    </div>
    <p class="measure" style="margin-top:1.6rem">Together we can explore what is contributing to your difficulties and develop a plan that supports your wellbeing.</p>
  </div>
</section>

<section class="surface-soft">
  <div class="wrap split top">
    <div>
      <h2>Common reasons people seek support for stress</h2>
      <ul class="chips"><li>Work-related stress</li><li>Career pressures</li><li>Burnout</li><li>Caring responsibilities</li><li>Relationship stress</li><li>Life transitions</li><li>Health concerns</li><li>Overthinking and worry</li><li>Perfectionism</li><li>Difficulty setting boundaries</li></ul>
    </div>
    <div>
      <h2>Online CBT therapy across Ireland</h2>
      <p>Online therapy provides a convenient and confidential way to access support from the comfort of your own home.</p>
      <ul class="ticks cols"><li>Flexible appointments</li><li>No travel required</li><li>Secure online sessions</li><li>Accessible throughout Ireland</li></ul>
    </div>
  </div>
</section>

<section>
  <div class="wrap split top">
    <div><h2>Frequently asked questions</h2></div>
    <div class="faq">
      <details open><summary>Can CBT help with stress?</summary><div class="answer">Yes. CBT is one of the most effective approaches for managing stress and developing healthier coping strategies.</div></details>
      <details><summary>How many sessions will I need?</summary><div class="answer">The number of sessions varies depending on your circumstances and goals.</div></details>
      <details><summary>Do you offer online appointments?</summary><div class="answer">Yes. I provide online CBT therapy for adults throughout Ireland.</div></details>
      <details><summary>Is stress counselling confidential?</summary><div class="answer">Yes. All sessions are confidential and conducted in a safe, supportive environment.</div></details>
    </div>
  </div>
</section>''' + related_posts(c, "stress")
    return layout(c, "CBT for Stress in Ireland | Online Stress Counselling | Breda Morrissey",
                  "Professional online CBT therapy for stress across Ireland. Learn practical ways to manage overwhelm, reduce worry and prevent burnout.",
                  body, og_image="cbt-working-with-stress.webp")

def cognitive_model():
    return """<figure class="model card" aria-labelledby="model-title">
  <p class="kicker" style="margin-bottom:.4rem">How CBT works</p>
  <h3 id="model-title">The cognitive model</h3>
  <p class="model-intro">The cognitive model describes how our thoughts and perceptions influence the way we feel and behave. It is at the core of CBT and helps us understand, and work with, the difficulties you bring.</p>
  <ol class="flow">
    <li class="flow-node"><b>Situation</b><span>A friend doesn’t reply to your message</span></li>
    <li class="flow-node"><b>Automatic thought(s)</b><span>“They must be annoyed with me”</span></li>
    <li class="flow-node"><b>Reaction</b></li>
  </ol>
  <ul class="flow-branch">
    <li class="flow-node"><b>Emotion</b><span>Anxious, low</span></li>
    <li class="flow-node"><b>Behaviour</b><span>Avoid getting in touch</span></li>
    <li class="flow-node"><b>Physiological response</b><span>Tight chest, restless</span></li>
  </ul>
  <figcaption class="model-foot">In CBT we learn to notice the automatic thought, test it, and choose a more balanced response.</figcaption>
</figure>"""

def page_services(c):
    approaches = [
      ("#cognitive-behavioural-therapy", "mind", "Cognitive Behavioural Therapy", "Change unhelpful thought and behaviour patterns."),
      ("#counselling-psychotherapy", "feelings", "Counselling &amp; Psychotherapy", "A safe space to explore what you’re carrying."),
      ("#mindfulness", "leaf", "Mindfulness (MBCT)", "Observe thoughts without judgement."),
    ]
    nav = "".join(f'<a class="approach" href="{c.link("services", a)}"><span class="cycle-ic small">{ICO[ic]}</span><span><b>{t}</b><small>{d}</small></span><span class="arr" aria-hidden="true">↓</span></a>' for a, ic, t, d in approaches)
    steps = [
      ("Get in touch", f'Call, text or WhatsApp <a href="tel:{TEL}">{PHONE}</a>, or email. I’ll reply within 24 hours.'),
      ("Your first session", "We meet online and explore what brings you to counselling, in a safe, non-judgemental space."),
      ("Set goals together", "We discuss what you’d like to achieve and how to make it a realistic goal."),
      ("Review as we go", "We agree how many sessions feel right and review your progress regularly."),
    ]
    steps_html = "".join(f'<li><b>{t}</b><span>{d}</span></li>' for t, d in steps)
    body = f'''
<section class="page-hero">
  {RIPPLE}
  <div class="wrap hero-split">
    <div>
      {crumbs(c, "Services")}
      <p class="kicker">Online CBT, counselling &amp; mindfulness</p>
      <h1>CBT &amp; counselling services</h1>
      <p class="lead">Discover how Cognitive Behavioural Therapy (CBT), Counselling &amp; Psychotherapy, and Mindfulness-based Cognitive Therapy can help you make sense of your thoughts, feelings and behaviours.</p>
      <p class="measure">Counselling with me focuses on you and your individual requirements. Every client is unique, and I won’t treat you with a “one size fits all” approach.</p>
      <div class="btn-row"><a class="btn btn-primary" href="{c.link('contact')}">Book a consultation</a><a class="btn btn-ghost" href="#what-to-expect">What to expect</a></div>
    </div>
    <nav class="approaches" aria-label="Therapies on this page">{nav}</nav>
  </div>
</section>

<section id="what-to-expect">
  <div class="wrap split top">
    <div>
      <p class="kicker">Getting started</p>
      <h2>What to expect</h2>
      <p>It’s natural to be apprehensive and I will try to put you at ease. The first session will give us a chance to meet and explore what brings you to counselling in a safe, non-judgemental environment.</p>
      <p>Together, we will discuss what you would like to achieve from counselling and how we can work to make this a realistic goal.</p>
      <h3 style="margin-top:1.6em">Online therapy</h3>
      <p>Online therapy provides an accessible and convenient mode of therapy. All you need is an internet connection. You don’t have to allow the time and cost of travel, and you can relax in your own environment.</p>
      <p>I understand how important privacy is for many clients, so I ensure our sessions stay safe and confidential.</p>
    </div>
    <div class="card blush">
      <h3>Your first steps</h3>
      <ol class="steps">{steps_html}</ol>
    </div>
  </div>
  <div class="wrap">
    <div class="issues card">
      <div><p class="kicker" style="margin-bottom:.4rem">What I help with</p><h3 style="margin:0">The issues I can help with include</h3></div>
      <ul class="chips"><li>Anxiety</li><li>Chronic pain</li><li>Tinnitus</li><li>Grief &amp; loss</li><li>Self-esteem &amp; confidence</li><li>Stress</li><li>Personal motivation (weight loss, fitness and work goals)</li><li>Sleep issues</li><li>Fertility issues</li><li>Depression</li><li>Relationships</li></ul>
    </div>
  </div>
</section>

<div class="svc" id="cognitive-behavioural-therapy">
  <div class="wrap split top">
    <div>
      <p class="kicker">Approach one</p>
      <h2>Cognitive Behavioural Therapy (CBT)</h2>
      <p>CBT is a talking therapy that can help you manage your problems by changing the way you think and behave. It is based on the idea that your thoughts, feelings, physical sensations and actions are interconnected, and that negative thoughts and feelings can trap you in a vicious cycle.</p>
      <p>CBT focuses on the thoughts, images, beliefs and attitudes that we hold, the personal meaning we associate with these, and how this relates to our behaviour. Working together using CBT, we can help you learn more useful ways of thinking and coping with past events and life moving forward, including problems you find overwhelming.</p>
      <p>Part of this is figuring out how to change negative patterns in practical ways you can use every day. I will support you throughout the process of creating positive and lasting change.</p>
      <h4>CBT has been shown to be effective for:</h4>
      <ul class="ticks cols"><li>Anxiety</li><li>Stress</li><li>Depression</li><li>Panic attacks</li><li>Sleep issues</li><li>Weight loss &amp; healthy eating</li><li>Motivation</li><li>PTSD</li><li>Fears &amp; phobias</li></ul>
      <div class="btn-row"><a class="btn btn-ghost" href="{c.link('anxiety')}">CBT for anxiety</a><a class="btn btn-ghost" href="{c.link('stress')}">CBT for stress</a></div>
    </div>
    {cognitive_model()}
  </div>
</div>

<div class="svc flip" id="counselling-psychotherapy">
  <div class="wrap split top">
    <figure class="quote-photo">
      <div class="media arch"><img src="{c.img('breda-morrissey-avatar.jpg')}" alt="Breda Morrissey, counsellor and psychotherapist" width="438" height="438" loading="lazy"></div>
      <figcaption>“I want you to feel understood and supported as an individual, not just as another client.”<span>Breda Morrissey</span></figcaption>
    </figure>
    <div>
      <p class="kicker">Approach two</p>
      <h2>Counselling &amp; Psychotherapy</h2>
      <p>Experiencing personal issues, emotional pain, or an emotional crisis from something that may have happened in your life? Therapy provides a confidential and safe place to explore these challenges with expert support.</p>
      <p>My approach is focused on providing a non-judgemental space where you can feel understood and supported as an individual, not just as another client.</p>
      <p>One of the main goals of therapy is the promotion of psychological wellbeing, both individually and in relationship with others. This is achieved through self-awareness, self-acceptance and self-compassion that we can work on together.</p>
      <h4>What therapy can help with:</h4>
      <ul class="ticks">
        <li>Frequently feeling overwhelmed</li>
        <li>Coming to terms with a trauma</li>
        <li>Experiencing a loss (bereavement, loss of job, end of relationship)</li>
        <li>Finding it difficult to carry out everyday activities, such as concentration affecting work or study</li>
        <li>Excessive worry, like always expecting the worst</li>
        <li>Relationship problems or struggling to communicate with someone important to you</li>
        <li>Holding yourself back due to self-doubt and struggling to recover after setbacks</li>
      </ul>
    </div>
  </div>
</div>

<div class="svc" id="mindfulness">
  <div class="wrap split top">
    <div>
      <p class="kicker">Approach three</p>
      <h2>Mindfulness</h2>
      <p>Mindfulness-based Cognitive Therapy (MBCT) combines cognitive therapy, meditation, and the cultivation of a present-oriented, non-judgemental attitude called “mindfulness”.</p>
      <p>By learning to be mindful, you will learn how to observe your thoughts and belief patterns without judgement, rather than engaging with ways of thinking that may not serve your best interests. With dedicated support, you can let go of self-criticism and develop a more compassionate internal dialogue.</p>
      <p>There are several mindfulness techniques and exercises used as part of MBCT, and we will work out together which ones will help you.</p>
      <h4>What MBCT can help with:</h4>
      <ul class="ticks cols"><li>Anxiety disorders</li><li>Eating habits (struggling to eat healthily, overeating)</li><li>Depression associated with medical illness</li><li>Low mood</li><li>Unhappiness</li><li>Depression relapse prevention</li></ul>
    </div>
    <div class="mindful">
      <div class="media"><img src="{CDN['tile_mindfulness']}" alt="Pink water lily on still water" loading="lazy"></div>
      <div class="pause card">
        <p class="kicker" style="margin-bottom:.3rem">A mindful pause</p>
        <p style="margin:0">Notice the thought. Name it. Let it pass, like a ripple settling on water.</p>
      </div>
    </div>
  </div>
</div>

<section class="surface-soft">
  <div class="wrap">{doctify_review(c)}</div>
</section>'''
    return layout(c, "Online CBT Therapist Serving Limerick & Nationwide | Services | Breda Morrissey",
                  "Breda Morrissey offers online sessions with Cognitive Behavioural Therapy, Counselling & Psychotherapy. Get support making sense of your thoughts and feelings!",
                  body)

FAQS = [
  ("How much does it cost?", f'Please contact me for fees on <a href="tel:{TEL}">{PHONE}</a> or <a href="mailto:{EMAIL}">{EMAIL}</a>.', f"Please contact me for fees on {PHONE} or {EMAIL}."),
  ("How long does each appointment last?", "50 to 60 minutes.", None),
  ("How do I schedule an appointment?", f'Email <a href="mailto:{EMAIL}">{EMAIL}</a>, or text, WhatsApp or ring <a href="tel:{TEL}">{PHONE}</a>. You can also DM @BredaMorrisseyCBT.', f"Email {EMAIL}, or text, WhatsApp or ring {PHONE}. You can also DM @BredaMorrisseyCBT."),
  ("How often should I come to therapy?", "Depending on the issues you want to address, I will help you decide how many sessions are appropriate. This is something we can look at in the first session and review regularly.", None),
  ("What is the cancellation policy?", "A minimum of 24 hours’ notice is required, otherwise the full fee will be charged.", None),
  ("How do I pay?", "Payments are made by bank transfer or PayPal.", None),
  ("What are your opening hours?", "Monday to Thursday, 7am to 7pm. Friday, 7am to 6pm.", None),
]
def page_faq(c):
    items = "".join(f'<details{" open" if i == 0 else ""}><summary>{q}</summary><div class="answer">{a}</div></details>' for i, (q, a, _) in enumerate(FAQS))
    hero = page_hero(c, "FAQ", "Frequently asked questions",
        "The questions I’m most often asked by clients and people thinking about counselling, including fees and how appointments work.")
    body = hero + f'''
<section>
  <div class="wrap split top">
    <div>
      <h2>Fees &amp; appointments</h2>
      <p>Can’t find your answer? Get in touch and I’ll be happy to help.</p>
      <div class="btn-row"><a class="btn btn-primary" href="{c.link('contact')}">Ask a question</a></div>
    </div>
    <div class="faq">{items}</div>
  </div>
</section>'''
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": (plain or re.sub(r"<[^>]+>", "", a))}} for q, a, plain in FAQS]}
    return layout(c, "CBT Counselling & Therapy | Frequently Asked Questions | Breda Morrissey",
                  "Get support making sense of your feelings with online counselling services. Find out how my therapy appointments work, including any fees.",
                  body, schema)

def page_contact(c):
    hero = page_hero(c, "Contact", "Get in touch",
        "If you have any general enquiries or questions about my counselling services, get in touch and I’ll see how I can support you.",
        '<p class="measure muted">You don’t have to have everything figured out. Just starting the conversation is enough.</p>')
    body = hero + f'''
<section>
  <div class="wrap contact-grid">
    <form class="form" id="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>
      <h2 style="font-size:1.9rem">Send a message</h2>
      <div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
      <div class="field"><label for="message">Message</label><textarea id="message" name="message" required></textarea></div>
      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-primary" type="submit">Send message</button>
      <p class="muted" style="font-size:.9rem;margin:12px 0 0">Replies can take up to 24 hours. Your message is confidential.</p>
      <div class="form-status" id="form-status" role="status" aria-live="polite"></div>
    </form>
    <div>
      <div class="methods">
        <a class="method" href="tel:{TEL}"><span class="ic">{ICON['phone']}</span><span><small>Phone or text</small><strong>{PHONE}</strong></span></a>
        <a class="method" href="mailto:{EMAIL}"><span class="ic">{ICON['mail']}</span><span><small>Email</small><strong>{EMAIL}</strong></span></a>
        <a class="method" href="{WA}" target="_blank" rel="noopener"><span class="ic">{ICON['wa']}</span><span><small>WhatsApp</small><strong>Message on WhatsApp</strong></span></a>
      </div>
      <div class="hours">
        <h4>Opening hours</h4>
        <dl><dt>Mon–Thu</dt><dd>7am – 7pm</dd><dt>Friday</dt><dd>7am – 6pm</dd></dl>
        <p style="margin:1rem 0 0;color:var(--muted);font-size:.95rem">All sessions online. Serving Cork, Limerick, Tipperary and clients nationwide across Ireland and the UK.</p>
      </div>
      <div style="margin-top:18px">{doctify_category(c)}</div>
    </div>
  </div>
</section>'''
    return layout(c, "Contact | Online Counselling Services | Breda Morrissey",
                  "Breda offers counselling services to help you make sense of your thoughts and feelings. General enquiries also welcome. All responses can take up to 24 hours.",
                  body)

def post_card(c, p, extracted=None):
    rt = reading_time(p, extracted or EXTRACTED)
    return f'''<a class="post-card" href="{c.link('post:' + p['slug'])}" data-topic="{p['rel']}">
  <div class="thumb"><img src="{c.img(p['img'])}" alt="" loading="lazy" width="600" height="400"></div>
  <div class="body"><p class="post-meta"><span class="tag">{E(TOPIC[p['rel']])}</span><span>{fmt_date(p['date'])}</span><span>{rt} min read</span></p>
  <h3>{E(p['title'])}</h3><p>{E(p['excerpt'])}</p><span class="go">Read article</span></div>
</a>'''

def page_blog(c):
    first, rest = POSTS[0], POSTS[1:]
    rt = reading_time(first, EXTRACTED)
    filters = '<button type="button" data-filter="all" aria-pressed="true">All articles</button>' + "".join(
        f'<button type="button" data-filter="{k}" aria-pressed="false">{E(v)}</button>' for k, v in TOPIC.items())
    body = f'''
<section class="page-hero">
  {RIPPLE}
  <div class="wrap">
    {crumbs(c, "Blog")}
    <p class="kicker">The blog</p>
    <h1>Tips for stress, anxiety &amp; your wellbeing</h1>
    <p class="lead">Practical CBT insights and gentle ideas to help you feel calmer and more in control, written by Breda Morrissey.</p>
  </div>
</section>
<section style="padding-top:clamp(40px,5vw,64px)">
  <div class="wrap">
    <a class="post-feature" href="{c.link('post:' + first['slug'])}">
      <div class="img"><img src="{c.img(first['img'])}" alt="" width="1536" height="1024"></div>
      <div class="txt"><p class="post-meta"><span class="tag">Latest · {E(TOPIC[first['rel']])}</span><span>{fmt_date(first['date'])}</span><span>{rt} min read</span></p>
      <h2>{E(first['title'])}</h2><p>{E(first['excerpt'])}</p><span class="go">Read the article</span></div>
    </a>
    <div class="filters" role="group" aria-label="Filter articles by topic">{filters}</div>
    <div class="posts" id="post-grid">{"".join(post_card(c, p) for p in rest)}</div>
  </div>
</section>
<script>
document.querySelectorAll('.filters button').forEach(function(b){{
  b.addEventListener('click',function(){{
    var f=b.dataset.filter;
    document.querySelectorAll('.filters button').forEach(function(x){{x.setAttribute('aria-pressed',String(x===b))}});
    document.querySelectorAll('#post-grid .post-card').forEach(function(card){{card.hidden=!(f==='all'||card.dataset.topic===f)}});
  }});
}});
</script>'''
    return layout(c, "Blog | Tips to Help Stress, Anxiety & Your Wellbeing | Breda Morrissey",
                  "Things to help boost your mood: CBT tips for stress, anxiety, overthinking and wellbeing from online counsellor Breda Morrissey.",
                  body)

REL_COPY = {
  "anxiety": ("Struggling with anxiety or overthinking?", "Online CBT can help you understand anxious thoughts, break the cycle of worry and feel more in control.", "Online CBT for anxiety"),
  "stress": ("Feeling stressed, overwhelmed or close to burnout?", "Online CBT gives you practical tools to manage stress, reduce worry and protect your wellbeing.", "Online CBT for stress"),
  "services": ("Looking for support?", "Explore CBT, counselling and mindfulness-based therapy, all available online across Ireland.", "View my services"),
}
def related_service(c, p):
    h, t, label = REL_COPY[p["rel"]]
    return f'''<div class="tip-box" style="margin-top:2.5em"><h3 style="margin-top:0">{h}</h3><p>{t}</p>
<div class="btn-row" style="margin-top:.6em"><a class="btn btn-primary" href="{c.link(p['rel'])}">{label}</a><a class="btn btn-ghost" href="{c.link('contact')}">Get in touch</a></div></div>'''

def related_posts(c, rel):
    items = [p for p in POSTS if p["rel"] == rel and not p.get("placeholder")][:3]
    return f'''<section class="surface-soft"><div class="wrap"><div class="section-head"><p class="kicker">From the blog</p><h2>Related reading</h2></div><div class="posts">{"".join(post_card(c, p) for p in items)}</div></div></section>'''

# ---------- blog post bodies ----------
SRC_DIR = os.path.join(ROOT, "source_pages")
POSTS_JSON = os.path.join(ROOT, "_source", "posts.json")
IMG_MAP = {"pexels-photo-7005411-1920w.jpeg": ("thoughts-notebook.webp", "The word thoughts printed on a notebook cover beside wheat stems"),
           "Blue-Orange-Illustrative-Mental-Health-Infographic-Instagram-Post-1920w.png": ("overthinking-reframes.webp", "Reframing overthinking: 'I have to' thoughts changed to 'I get to' thoughts")}

def clean_body(raw, c, title):
    b = raw.replace("\ufeff", "")
    b = re.sub(r"<a href=\"https://www\.bredamorrissey\.com/[^\"]*\">\s*<p>(&lt; Older Post|Newer Post >)</p></a>", "", b)
    b = re.sub(r"<p>\s*</p>", "", b)
    def imgsub(m):
        name = m.group(1)
        if name in IMG_MAP:
            f, alt = IMG_MAP[name]
            return f'</p><figure><img src="{c.img(f)}" alt="{E(alt)}" loading="lazy"></figure><p>'
        return ""
    b = re.sub(r"\[\[IMG:([^\]]+)\]\]", imgsub, b)
    b = re.sub(r"<p>\s*</p>", "", b)
    # short bold-only paragraphs become headings
    b = re.sub(r"<p>\s*<strong>([^<]{3,90})</strong>\s*</p>", r"<h2>\1</h2>", b)
    # leading h3(s) become a standfirst
    m = re.match(r"\s*((?:<h3>.*?</h3>\s*)+)", b, re.S)
    if m:
        sf = re.sub(r"</?(h3|strong)>", " ", m.group(1))
        sf = re.sub(r"\s+", " ", sf).strip()
        b = f'<p class="standfirst">{sf}</p>' + b[m.end():]
    # drop an h2 that repeats the title
    b = re.sub(r"<h2>How to Stop Overthinking Everything[^<]*</h2>", "", b)
    # unify a bare "The Physical Toll" style paragraph headings
    b = re.sub(r"<p>(The Physical Toll|When Your Identity Becomes \"The Carer\"|Signs You May Be Experiencing Carer Burnout|Looking After Yourself While Caring for Others|Remember: You Matter Too|Give Yourself Permission to Rest|Stay Connected|Accept Help|Prioritise Small Moments of Self-Care|Acknowledge Your Feelings|Consider Professional Support)</p>",
               lambda m: f"<h{'3' if m.group(1) in ('Give Yourself Permission to Rest','Stay Connected','Accept Help','Prioritise Small Moments of Self-Care','Acknowledge Your Feelings','Consider Professional Support') else '2'}>{m.group(1)}</h{'3' if m.group(1) in ('Give Yourself Permission to Rest','Stay Connected','Accept Help','Prioritise Small Moments of Self-Care','Acknowledge Your Feelings','Consider Professional Support') else '2'}>", b)
    b = re.sub(r"\s+", " ", b)
    b = re.sub(r"(</(p|h2|h3|ul|ol|figure)>)", r"\1\n", b)
    return b.strip()

ONLINE_CBT = '''<p class="standfirst">Do you ever find yourself overthinking conversations, worrying about things that might happen, or feeling as though your mind simply won’t switch off?</p>
<p>Perhaps you notice your heart racing, feel tense, struggle to sleep, or find yourself avoiding situations that make you anxious.</p>
<p>Anxiety can affect many areas of our lives, from relationships and work to sleep, confidence and everyday activities. Sometimes, even when we know our worries may be out of proportion, it can be difficult to break the cycle.</p>
<p>The good news is that you can learn new ways of understanding and managing anxiety. Cognitive Behavioural Therapy (CBT) is one approach that can help, and online CBT therapy makes accessing support more convenient.</p>
<h2>What is CBT and how does it help with anxiety?</h2>
<p>CBT is a talking therapy that explores the relationship between our thoughts, feelings, physical sensations and behaviours.</p>
<p>When we feel anxious, we may automatically imagine the worst-case scenario, interpret uncertainty as danger or underestimate our ability to cope. These thoughts can increase physical symptoms of anxiety and lead us to avoid situations that feel uncomfortable. Although avoidance can bring temporary relief, it can sometimes reinforce our fears over time.</p>
<p>For example, imagine you are invited to a social event. You might think, “I’ll feel awkward, nobody will talk to me, and I won’t know what to say.” This could leave you feeling anxious, with a racing heart and a strong urge to cancel. If you stay at home, your anxiety may ease temporarily. However, you miss the opportunity to discover that you might have managed better than expected.</p>
<p>CBT helps you recognise these patterns, question unhelpful assumptions and gradually develop more helpful ways of responding. Research and clinical guidelines support CBT as an effective treatment option for anxiety disorders (NICE, 2020).</p>
<h2>What happens during online CBT therapy?</h2>
<p>Online therapy allows you to work with a therapist through video sessions from a space where you feel comfortable and private. During sessions, we can explore what triggers your anxiety, identify recurring thought patterns and understand the behaviours that may be keeping you stuck.</p>
<p>Depending on your needs and goals, CBT techniques may include:</p>
<ul>
<li><strong>Understanding anxious thoughts:</strong> learning to recognise unhelpful thinking patterns and consider alternative perspectives.</li>
<li><strong>Managing overthinking and worry:</strong> developing practical strategies to step back from repetitive worries rather than getting caught up in them.</li>
<li><strong>Gradually facing fears:</strong> building confidence through manageable steps instead of continually avoiding situations that cause anxiety.</li>
<li><strong>Understanding physical symptoms:</strong> exploring how anxiety affects your body and practising techniques to respond more effectively.</li>
<li><strong>Building confidence and self-belief:</strong> identifying underlying beliefs and developing a more balanced view of yourself and your abilities.</li>
</ul>
<p>CBT is collaborative. You and your therapist work together to identify what is important to you, agree on realistic goals and practise skills that you can use in everyday life.</p>
<p>The aim is not to eliminate every anxious thought or feeling. It is to help you respond differently to anxiety so that it has less control over your decisions and your life.</p>
<h2>Is online CBT as useful as attending therapy in person?</h2>
<p>Online therapy offers a flexible way to access professional support without travelling to appointments. You can attend from home, fit sessions around work or family commitments, and access support even if you live outside a major town or city. For many people, being in a familiar environment can also make it easier to talk openly.</p>
<p>CBT can be delivered online, in person or by telephone, although the most appropriate approach depends on your circumstances, needs and preferences. Evidence-based online interventions are also recognised in clinical guidance for anxiety (NHS; NICE, 2023).</p>
<p>You will need a private space, a reliable internet connection and a device suitable for video calls.</p>
<div class="tip-box">
<h3 style="margin-top:0">A small step you can try today</h3>
<p>The next time you notice anxiety building, pause and ask yourself:</p>
<ul>
<li>What am I telling myself about this situation?</li>
<li>What evidence supports my worry, and is there another way of looking at it?</li>
<li>What small, helpful action could I take, even if I still feel anxious?</li>
</ul>
<p style="margin:0">You do not need to feel completely confident before taking a step forward. Sometimes, confidence develops through discovering that you can manage situations you once found difficult.</p>
</div>
<p>If anxiety is persistent or interfering with your daily life, professional support can help you explore these patterns in greater depth.</p>
<h2>Taking the first step towards managing anxiety</h2>
<p>You do not have to navigate anxiety alone, and seeking support does not mean that you have failed to cope. It is an opportunity to understand yourself better, develop practical skills and begin making changes at a pace that feels manageable.</p>
<p>I’m Breda Morrissey, an accredited therapist specialising in CBT, counselling and psychotherapy. I offer online therapy sessions for adults across Ireland, providing a supportive, collaborative and non-judgemental space to explore difficulties and work towards meaningful change.</p>
<p>You deserve support, understanding and the opportunity to feel more confident in your everyday life.</p>
<div class="refs">
<h4>References and further reading</h4>
<p>National Institute for Health and Care Excellence (NICE). (2020). <em>Generalised anxiety disorder and panic disorder in adults: management.</em> Clinical guideline CG113.</p>
<p>National Institute for Health and Care Excellence (NICE). (2023). <em>Digitally enabled therapies for adults with anxiety disorders.</em> Health technology guidance HTG676.</p>
<p>NHS. <em>Cognitive behavioural therapy (CBT).</em> An overview of CBT, how it works and the conditions it can help with.</p>
</div>'''

def page_post(c, p, idx, extracted):
    if p["src"] is None:
        content = ONLINE_CBT
    elif p.get("placeholder"):
        content = ('<div class="mockup-note"><strong>Content needed:</strong> on the live site this post still shows the '
                   'template’s default placeholder text. Add the article body here before launch, or leave it unpublished.</div>')
    else:
        content = clean_body(extracted[p["src"]]["body"], c, p["title"])
    rt = reading_time(p, extracted)
    newer = POSTS[idx - 1] if idx > 0 else None
    older = POSTS[idx + 1] if idx + 1 < len(POSTS) else None
    nav = '<nav class="post-nav" aria-label="More articles">'
    nav += f'<a href="{c.link("post:" + older["slug"])}"><small>‹ Older article</small>{E(older["title"])}</a>' if older else "<span></span>"
    nav += f'<a class="next" href="{c.link("post:" + newer["slug"])}"><small>Newer article ›</small>{E(newer["title"])}</a>' if newer else "<span></span>"
    nav += "</nav>"
    more = [q for q in POSTS if q["slug"] != p["slug"] and q["rel"] == p["rel"] and not q.get("placeholder")][:3]
    mini = "".join(f'<li><a href="{c.link("post:" + q["slug"])}"><img src="{c.img(q["img"])}" alt="" loading="lazy" width="64" height="64">{E(q["title"])}</a></li>' for q in more)
    h, t, label = REL_COPY[p["rel"]]
    body = f'''
<section class="page-hero">
  {RIPPLE}
  <div class="wrap article-head">
    <div>
      {crumbs(c, "Article", ("blog", "Blog"))}
      <p class="post-meta"><span class="tag">{E(TOPIC[p['rel']])}</span><span>{fmt_date(p['date'])}</span><span>{rt} min read</span></p>
      <h1>{E(p['title'])}</h1>
      <div class="byline"><img src="{c.img('breda-morrissey-counsellor.jpg')}" alt="" width="46" height="46"><div><b>Breda Morrissey</b><span>Accredited counsellor &amp; CBT psychotherapist</span></div></div>
    </div>
    <div class="media arch"><img src="{c.img(p['img'])}" alt="" fetchpriority="high"></div>
  </div>
</section>
<section>
  <div class="wrap article-layout">
    <article class="article">
      {content}
      <div class="tip-box"><h3 style="margin-top:0">{h}</h3><p>{t}</p>
        <div class="btn-row" style="margin-top:.6em"><a class="btn btn-primary" href="{c.link(p['rel'])}">{label}</a><a class="btn btn-ghost" href="{c.link('contact')}">Get in touch</a></div></div>
      {nav}
    </article>
    <aside class="aside" aria-label="About the author and related articles">
      <div class="card blush">
        <div class="byline" style="margin:0 0 14px"><img src="{c.img('breda-morrissey-counsellor.jpg')}" alt="" width="46" height="46"><div><b>Breda Morrissey</b><span>BA (Hons) APCP</span></div></div>
        <p style="font-size:.97rem">Accredited counsellor and psychotherapist offering online CBT, counselling and mindfulness for adults across Ireland and the UK.</p>
        <a class="btn btn-primary" style="width:100%" href="{c.link('contact')}">Book a consultation</a>
      </div>
      {f'<div class="card"><h3>More on {E(TOPIC[p["rel"]].lower())}</h3><ul class="mini">{mini}</ul></div>' if mini else ''}
    </aside>
  </div>
</section>'''
    schema = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"], "datePublished": p["date"],
              "image": DOMAIN + "/images/" + p["img"], "url": DOMAIN + "/blog/" + p["slug"], "mainEntityOfPage": DOMAIN + "/blog/" + p["slug"],
              "timeRequired": f"PT{rt}M",
              "author": {"@type": "Person", "name": "Breda Morrissey", "url": DOMAIN + "/"},
              "publisher": {"@type": "Organization", "name": "Breda Morrissey Counselling & CBT", "logo": {"@type": "ImageObject", "url": DOMAIN + "/images/breda-morrissey-logo.svg"}}}
    return layout(c, f"{p['title']} | Breda Morrissey", p["desc"], body, schema, og_image=p["img"], noindex=bool(p.get("placeholder")))

def page_404(c):
    body = f'''<section class="page-hero surface-soft">{RIPPLE}<div class="wrap">
<h1>Page not found</h1><p class="lead">The page you’re looking for has moved or no longer exists.</p>
<div class="btn-row"><a class="btn btn-primary" href="{c.link('home')}">Go to the home page</a><a class="btn btn-ghost" href="{c.link('contact')}">Get in touch</a></div>
</div></section>'''
    return layout(c, "Page not found | Breda Morrissey", "This page could not be found.", body, noindex=True)

EXTRACTED = json.load(open(POSTS_JSON))
def build(mode):
    out = SITE if mode == "site" else PREVIEW
    extracted = EXTRACTED
    builders = {"home": page_home, "anxiety": page_anxiety, "stress": page_stress, "services": page_services,
                "faq": page_faq, "contact": page_contact, "blog": page_blog, "404": page_404}
    for key in PAGES:
        c = Ctx(mode, key)
        if key.startswith("post:"):
            slug = key[5:]
            idx = next(i for i, p in enumerate(POSTS) if p["slug"] == slug)
            html_out = page_post(c, POSTS[idx], idx, extracted)
        else:
            html_out = builders[key](c)
        fname = PAGES[key][0] if mode == "site" else PAGES[key][2]
        path = os.path.join(out, fname)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "w", encoding="utf-8").write(html_out)

def write_meta():
    today = date.today().isoformat()
    rows = []
    for k in PAGES:
        if k == "404": continue
        lastmod = today
        if k.startswith("post:"):
            post = next(p for p in POSTS if p["slug"] == k[5:])
            if post.get("placeholder"): continue
            lastmod = post["date"]
        rows.append((PAGES[k][1], lastmod))
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"  <url><loc>{DOMAIN}{u}</loc><lastmod>{m}</lastmod></url>\n" for u, m in rows) + "</urlset>\n"
    open(os.path.join(SITE, "sitemap.xml"), "w").write(sm)
    open(os.path.join(SITE, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n")
    vercel = {"cleanUrls": True, "trailingSlash": False,
              "redirects": [{"source": a, "destination": b, "statusCode": 301} for a, b in REDIRECTS],
              "headers": [{"source": "/images/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
                          {"source": "/assets/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=86400"}]},
                          {"source": "/(.*)", "headers": [{"key": "X-Content-Type-Options", "value": "nosniff"},
                                                          {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                                                          {"key": "X-Frame-Options", "value": "SAMEORIGIN"}]}]}
    open(os.path.join(SITE, "vercel.json"), "w").write(json.dumps(vercel, indent=2) + "\n")

if __name__ == "__main__":
    build("site"); build("preview"); write_meta()
    print("Built", len(PAGES), "pages")
