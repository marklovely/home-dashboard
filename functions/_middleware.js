import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';

/**
 * Validates Cloudflare Access on Pages Functions (including /api/*).
 * Requires CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD_PAGES on the Pages project.
 *
 * @type {import('@cloudflare/workers-types').PagesFunction}
 */
async function accessMiddleware(context) {
  const team = context.env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const aud = context.env.CF_ACCESS_AUD_PAGES?.trim();
  if (!team || !aud) {
    return context.next();
  }

  const domain = team.startsWith('https://') ? team : `https://${team}`;
  const handler = cloudflareAccessPlugin({
    domain,
    aud
  });
  return handler(context);
}

export const onRequest = [accessMiddleware];
