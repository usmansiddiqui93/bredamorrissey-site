// Public renderer: /blog, /blog/:slug, /:slug (CMS pages) and /sitemap.xml
const store = require("./_lib/store");
const R = require("./_lib/render");
const { isAuthed } = require("./_lib/auth");

module.exports = async (req, res) => {
  const { route, slug } = req.query || {};
  const admin = isAuthed(req);
  const send = (status, html, type = "text/html; charset=utf-8", cache = true) => {
    res.statusCode = status;
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", cache && !admin && status === 200 ? "public, max-age=0, s-maxage=60, stale-while-revalidate=300" : "no-store");
    res.end(html);
  };
  try {
    if (route === "sitemap") {
      const [posts, pages] = await Promise.all([store.list("posts"), store.list("pages")]);
      return send(200, R.sitemap(posts, pages), "application/xml; charset=utf-8");
    }
    if (route === "blog") return send(200, R.blogIndex(await store.list("posts")));
    if (route === "post") {
      const posts = await store.list("posts");
      const p = posts.find((x) => x.slug === slug);
      if (!p || (p.status !== "published" && !admin)) return send(404, R.notFound());
      return send(200, R.postPage(p, posts, { preview: admin && p.status !== "published" }), undefined, p.status === "published");
    }
    if (route === "page") {
      const pages = await store.list("pages");
      const pg = pages.find((x) => x.slug === slug);
      if (!pg || (pg.status !== "published" && !admin)) return send(404, R.notFound());
      return send(200, R.customPage(pg, { preview: admin && pg.status !== "published" }), undefined, pg.status === "published");
    }
    return send(404, R.notFound());
  } catch (e) {
    console.error(e);
    return send(500, R.notFound(), undefined, false);
  }
};
