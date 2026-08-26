/**
 * When DEMO_PUBLIC is set on the Pages project, require demo username/password
 * before serving the hub shell (Cloudflare Access is disabled for this site).
 *
 * Login is served as dist/sign-in.html → /sign-in via Cloudflare Pages pretty URLs.
 * Do not add _redirects rules for the login path — they conflict with pretty URLs
 * and cause ERR_TOO_MANY_REDIRECTS (308 loops on /demo-login).
 */

/** @type {readonly string[]} */
export const DEMO_PUBLIC_PATHS = ['/sign-in', '/sign-in/'];

/**
 * @param {string} pathname
 */
export function isDemoPublicPath(pathname) {
  if (DEMO_PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname === '/sign-in.html') return true;
  if (pathname.startsWith('/api/demo/')) return true;
  if (pathname === '/api/health') return true;
  if (pathname.startsWith('/assets/')) return true;
  if (pathname.startsWith('/css/')) return true;
  if (pathname.startsWith('/js/')) return true;
  if (pathname.startsWith('/icons/')) return true;
  if (/\.(css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest|json)$/i.test(pathname)) return true;
  return false;
}

/**
 * @param {import('@cloudflare/workers-types').EventContext<Record<string, unknown>, string, unknown>} context
 */
export async function demoPagesGate(context) {
  if (context.env.DEMO_PUBLIC !== 'true') {
    return context.next();
  }

  const url = new URL(context.request.url);
  const { pathname } = url;

  if (isDemoPublicPath(pathname)) {
    return context.next();
  }

  const sessionUrl = new URL('/api/demo/session', url.origin);
  try {
    const sessionResponse = await fetch(sessionUrl.toString(), {
      method: 'GET',
      headers: {
        Cookie: context.request.headers.get('Cookie') ?? '',
        Accept: 'application/json'
      }
    });
    if (sessionResponse.ok) {
      const body = await sessionResponse.json();
      if (body?.authenticated) {
        return context.next();
      }
    }
  } catch {
    /* fall through to login redirect */
  }

  const acceptsHtml = (context.request.headers.get('Accept') ?? '').includes('text/html');
  const isAppShellRoute =
    pathname === '/' || pathname === '/index.html' || (!pathname.includes('.') && acceptsHtml);

  if (isAppShellRoute) {
    return Response.redirect(new URL('/sign-in', url.origin).toString(), 302);
  }

  return context.next();
}
