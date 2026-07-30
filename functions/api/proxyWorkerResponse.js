/**
 * Preserve all upstream headers (especially multiple Set-Cookie values).
 *
 * @param {Response} upstream
 */
export function proxyWorkerResponse(upstream) {
  const headers = new Headers(upstream.headers);

  if (typeof upstream.headers.getSetCookie === 'function') {
    headers.delete('set-cookie');
    for (const cookie of upstream.headers.getSetCookie()) {
      headers.append('Set-Cookie', cookie);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
