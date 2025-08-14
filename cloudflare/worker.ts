// worker.js
export default {
  async fetch(req, env) {
    // Upstream feed you want to serve
    const upstream = 'https://bsky.app/profile/YOUR_BSKY_HANDLE/rss';

    // Forward conditional headers for efficient caching
    const headers = new Headers();
    const h = req.headers;
    ['if-none-match','if-modified-since','cache-control'].forEach(k => {
      if (h.get(k)) headers.set(k, h.get(k));
    });

    const res = await fetch(upstream, { headers });

    // Pass through 304s and caching metadata
    if (res.status === 304) return new Response(null, { status: 304 });

    // Ensure correct content type at your edge
    const out = new Response(res.body, res);
    out.headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
    // (Optional) set your own caching policy at the edge
    // out.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return out;
  }
}
