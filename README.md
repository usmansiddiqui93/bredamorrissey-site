# Breda Morrissey website: redesign (Vercel-ready)

Design: the approved "still water" mockup, refined. Palette built on blush #F1E6EA with deep plum
(#3A2034 / #5C3553 / #7A4A6E), rose #C99AAE and a muted gold accent #C8A26A for stars. Fonts: DM Sans and Open Sans, as on her current site.

## View it
Open `preview/index.html` in Chrome. Every page and link works locally.
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
2. **Contact form.** Create a free Formspree form and replace `YOUR_FORM_ID` in `site/contact.html`.
3. **Images still on her Duda CDN.** Download these into `site/images/` and update the URLs in the HTML
   (search for `irp.cdn-website.com`) before cancelling Duda:
   - pexels-photo-4065876 (CBT tile), pexels-photo-3760280 (counselling tile), waterlily (mindfulness)
   (the services page no longer uses the water-drop banner, laptop photo, stock portrait or social graphic)
4. **Logo.** `images/breda-morrissey-logo.svg` (plum, bold) and `breda-morrissey-logo-white.svg` (footer) are vector files with the
   text converted to outlines, so they render sharply at any size. `favicon.svg` uses the tree emblem.
   The emblem is a redrawn version of her tree mark; if she has the designer's original vector, it can replace the tree.
5. **Placeholder posts.** "January Without the Pressure" and "September Reset" have no body text on the live site.
   They are set to `noindex` and left out of the sitemap until content is added.

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
