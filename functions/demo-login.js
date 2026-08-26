/**
 * Serve demo-login.html at /demo-login without Cloudflare Pages pretty-URL 308 loops.
 * @type {import('@cloudflare/workers-types').PagesFunction}
 */
export async function onRequest(context) {
  const assetRequest = new Request(new URL('/demo-login.html', context.request.url), context.request);
  const assets = context.env.ASSETS;
  if (assets && typeof assets.fetch === 'function') {
    return assets.fetch(assetRequest);
  }
  return context.next();
}
