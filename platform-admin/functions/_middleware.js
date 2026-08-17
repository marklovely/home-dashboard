import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';
import { accessTeamOrigin } from '../../../functions/lib/accessTeamDomain.js';

/** @type {import('@cloudflare/workers-types').PagesFunction} */
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

export const onRequest = [accessMiddleware];
