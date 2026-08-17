/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function operatorEmailAllowlist(env) {
  const raw = env.PLATFORM_OPERATOR_EMAILS?.trim() ?? env.OWNER_EMAILS?.trim() ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {unknown} middlewareData
 * @returns {string | null}
 */
export function middlewareOperatorEmail(middlewareData) {
  if (!middlewareData || typeof middlewareData !== 'object') return null;
  const email = /** @type {{ jwtPayload?: { email?: string } }} */ (middlewareData).jwtPayload?.email;
  return email ? String(email).trim().toLowerCase() : null;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {unknown} [middlewareData]
 * @returns {{ ok: true, email: string } | { ok: false, response: Response }}
 */
export function requirePlatformOperator(request, env, middlewareData) {
  const allowlist = operatorEmailAllowlist(env);
  const email = middlewareOperatorEmail(middlewareData);

  if (allowlist.length === 0) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'PLATFORM_NOT_CONFIGURED',
          message: 'Set PLATFORM_OPERATOR_EMAILS on the platform Pages project.'
        },
        { status: 503 }
      )
    };
  }

  if (!email) {
    return {
      ok: false,
      response: Response.json(
        { error: 'UNAUTHORIZED', message: 'Cloudflare Access login required.' },
        { status: 401 }
      )
    };
  }

  if (!allowlist.includes(email)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'FORBIDDEN', message: 'Not a platform operator.' },
        { status: 403 }
      )
    };
  }

  return { ok: true, email };
}
