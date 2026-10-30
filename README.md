# Breda Morrissey website: redesign (Vercel-ready)

Design: the approved "still water" mockup, refined. Palette built on blush #F1E6EA with deep plum
(#3A2034 / #5C3553 / #7A4A6E), rose #C99AAE and a muted gold accent #C8A26A for stars. Fonts: DM Sans and Open Sans, as on her current site.

## View it
Open `preview/index.html` in Chrome for a quick static look (the CMS and contact form need the dev server or Vercel).
Fonts (DM Sans, Open Sans) and the few images still on her Duda CDN need an internet connection.

## Deploy to Vercel
Deploy the `site/` folder only (set it as the project root, framework preset "Other", no build command).
`site/vercel.json` turns on clean URLs and sends a **301 redirect from every old Duda URL** to its new address,
so existing rankings and backlinks carry over.

| Page | New URL | Old URL (301s to new) |
|---|---|---|
| Home | `/` | `/` |
| CBT for Anxiety | `/cbt-for-anxiety` | `/Anxiety/depression` |
| CBT for Stress | `/cbt-for-stress` | `/empty-page` |
| Services / FAQ / Contact / Blog | unchanged | unchanged |
| Blog posts | `/blog/<short-slug>` | `/<long-slug>` (10 redirects) |

Also included: `sitemap.xml` (with lastmod), `robots.txt`, `404.html`, BreadcrumbList schema on every inner page,
and related-reading links between service pages and blog posts.

### After launch
1. Vercel > Domains: make `www.bredamorrissey.com` primary and redirect the bare domain to it (canonicals use www).
2. Google Search Console: submit `/sitemap.xml`, then use URL Inspection on the new service pages.
3. Spot-check the redirects: `curl -I https://www.bredamorrissey.com/empty-page` should return `301` to `/cbt-for-stress`.
4. Update the URLs on Doctify, Psychology Today, Google Business Profile and social bios to the new addresses.
5. Watch Search Console > Pages for 404s for 4 to 6 weeks and add any missed redirects to `vercel.json`.

## Before going live
1. **Doctify widgets.** Each page has static replicas marked with `<!-- DOCTIFY: replace ... -->`.
   Paste the real embed code (Doctify dashboard > Widgets, or copy it from the HTML widgets in her Duda editor):
   - "Average rating" badge: home hero
   - "Average carousel rating": home, services
   - "Average category rating": anxiety, contact
   Include Doctify's autoresize script once per page.
2. **Contact form.** Now handled by the built-in CMS (`/api/contact`). Complete the CMS setup below.
3. **Images still on her Duda CDN.** Download these into `site/images/` and update the URLs in the HTML
   (search for `irp.cdn-website.com`) before cancelling Duda:
   - pexels-photo-4065876 (CBT tile), pexels-photo-3760280 (counselling tile), waterlily (mindfulness)
   (the services page no longer uses the water-drop banner, laptop photo, stock portrait or social graphic)
4. **Logo.** `images/breda-morrissey-logo.svg` (plum, bold) and `breda-morrissey-logo-white.svg` (footer) are vector files with the
   text converted to outlines, so they render sharply at any size. `favicon.svg` uses the tree emblem.
   The emblem is a redrawn version of her tree mark; if she has the designer's original vector, it can replace the tree.
5. **Placeholder posts.** "January Without the Pressure" and "September Reset" have no body text on the live site.
   They are set to `noindex` and left out of the sitemap until content is added.


## Home page (from the client brief)
- All copy follows `Breda_Morrisey_Homepage_Brief.docx`: hero, safe space, Hi I'm Breda, How I can help you (5 services),
  How we'll work together (3 steps + fees card), Rebuild confidence CTA, and 7 FAQs (with FAQPage schema).
- **Fees:** set `FEE_SESSION`, `FEE_DURATION` and `FEE_INITIAL` at the top of the home section in `_source/build.py`,
  then rebuild. Until then they show a yellow "To be confirmed" marker (and the cost FAQ is left out of the schema).
- **Service links:** "Explore anxiety counselling" goes to /cbt-for-anxiety. The other four (depression, emotional eating,
  self-confidence, relationships) point to /services until their own pages exist. Suggested CMS page URLs:
  /depression-counselling, /emotional-eating-support, /self-confidence-counselling, /relationship-counselling.
- **"More about me"** jumps to the accreditation section until an About page is created.

## Built-in CMS (admin at /admin)

Breda logs in at `https://www.bredamorrissey.com/admin` to:
- **Enquiries:** read contact-form messages, reply by email or phone, mark read/unread, delete, export CSV.
- **Blog posts:** create, edit, publish/unpublish and delete posts. Each post has a title, URL, summary, topic, date,
  cover image, SEO title/description with a Google preview, and content sections
  (Text, Image + text, Image, Checklist, Quote, FAQs, Call to action). The 10 existing posts are loaded automatically.
- **Pages:** build new pages from sections (Page header, Text, Image + text, Checklist, Quote, FAQs, Image, Call to action),
  with background options, reordering, drafts and "hide from Google".
- **Media library:** upload images (resized in the browser automatically), reuse them, copy links, delete.

The designed pages (Home, CBT for Anxiety, CBT for Stress, Services, FAQ, Contact) stay as hand-built HTML and are edited
by the developer. Blog, CMS pages and the sitemap are rendered by `site/api/render.js` using the same header, footer and styles.

### One-time setup in Vercel (about 10 minutes)
1. **Environment variables** (Project > Settings > Environment Variables):
   - `ADMIN_PASSWORD`: the password Breda will use (long and unique).
   - `SESSION_SECRET`: any long random string (e.g. 40+ characters).
2. **Data storage:** Project > Storage > connect **Upstash Redis** (free tier is plenty). Choose an EU region
   (e.g. Ireland or Frankfurt), because enquiries contain personal data. Vercel adds the connection variables automatically.
3. **Image storage:** Project > Storage > create a **Blob** store and connect it to the project.
4. **Optional email alerts** for new enquiries: create a free Resend account, then add `RESEND_API_KEY`,
   `NOTIFY_EMAIL` (Breda's email) and `NOTIFY_FROM` (a sender on a domain verified in Resend).
5. **Redeploy** (Deployments > ... > Redeploy) so the new variables take effect, then log in at `/admin`.

Until storage is connected, the admin shows a yellow warning and nothing is kept permanently.

### Notes
- Edits go live within about a minute (pages are cached for 60 seconds).
- Drafts can be previewed with **View** while logged in; they are hidden from visitors and Google.
- Deleting a blog post breaks any links to it (for example "Related reading" on the service pages).
- Vercel's free Hobby plan is for non-commercial use; a business website should be on the Pro plan.

### Run it locally
```
cd site && npm install && cd ..
ADMIN_PASSWORD=choose-one node _source/dev-server.js
```
Open http://localhost:3000 and http://localhost:3000/admin. Local content is saved in `.data/`.

## Diagrams built in HTML (no baked-in text images)
- **CBT for Anxiety:** "The CBT cycle" is an HTML/SVG diagram (Thoughts, Feelings, Behaviours, More anxiety) with animated arrows,
  a "CBT can help you" checklist and a reassurance panel. It stacks into a vertical flow on mobile.
- **CBT for Stress:** the hero "CBT: working with stress" card is HTML with an SVG stone-and-sprig illustration and four icon pillars.
The original infographic images remain in /images and are still used as social share (og:image) previews.

## Services page
- Hero: three approach cards linking to each therapy section.
- "Your first steps" numbered sequence, issues list, and "The cognitive model" flow chart built in HTML
  (Situation > Automatic thought(s) > Reaction > Emotion / Behaviour / Physiological response).
- New copy for client approval: the worked example inside the flow chart ("A friend doesn't reply..."),
  the counselling pull quote, and the "mindful pause" line.

## Editing
Edit the HTML in `site/` directly, or edit `_source/build.py` and run `python3 build.py` to regenerate all pages
(keeps header, footer and navigation consistent).
