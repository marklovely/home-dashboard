import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';
import { accessTeamOrigin } from './lib/accessTeamDomain.js';
import { demoPagesGate } from './lib/demoPagesGate.js';

/**
 * Validates Cloudflare Access on Pages Functions (including /api/*).
 * Requires CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD_PAGES on the Pages project.
 *
 * @type {import('@cloudflare/workers-types').PagesFunction}
 */
async function accessMiddleware(context) {
  const domain = accessTeamOrigin(context.env.CF_ACCESS_TEAM_DOMAIN);
  const aud = context.env.CF_ACCESS_AUD_PAGES?.trim();
  if (!domain || !aud) {
    return context.next();
  }

  const handler = cloudflareAccessPlugin({
    domain,
    aud
  });
  return handler(context);
}

export const onRequest = [demoPagesGate, accessMiddleware];
