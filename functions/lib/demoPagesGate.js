/**
 * When DEMO_PUBLIC is set on the Pages project, require demo username/password
 * before serving the hub shell (Cloudflare Access is disabled for this site).
 */

/**
 * @param {string} pathname
 */
function isPublicDemoAsset(pathname) {
  if (pathname === '/demo-login.html') return true;
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

  if (isPublicDemoAsset(pathname)) {
    return context.next();
  }

  const sessionUrl = new URL('/api/demo/session', url.origin);
  try {
    const sessionResponse = await fetch(sessionUrl.toString(), {
      headers: {
        Cookie: context.request.headers.get('Cookie') ?? ''
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
    return Response.redirect(new URL('/demo-login.html', url.origin).toString(), 302);
  }

  return context.next();
}
