import {
  getPlatformBillingDb,
  handleStripeBillingEvent,
  platformBillingDbConfigured,
  readVerifiedStripeEvent
} from '../platform/platformBilling.js';

/**
 * Stripe webhooks — /api/stripe/*
 * No Cloudflare Access at Zero Trust — see platform_stripe_webhook Access app (terraform) or manual bypass.
 *
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] } }} context
 */
export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const suffix = normalizePath(params.path);

  if (suffix !== 'webhook' || request.method !== 'POST') {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (!platformBillingDbConfigured(/** @type {Record<string, string | undefined>} */ (env))) {
    return Response.json(
      {
        error: 'BILLING_DB_NOT_CONFIGURED',
        message: 'Bind PLATFORM_BILLING_DB on the platform Pages project and apply migrations.'
      },
      { status: 503 }
    );
  }

  const verified = await readVerifiedStripeEvent(
    request,
    /** @type {Record<string, string | undefined>} */ (env)
  );
  if (!verified.ok) return verified.response;

  const db = getPlatformBillingDb(env);
  if (!db) {
    return Response.json({ error: 'BILLING_DB_NOT_CONFIGURED' }, { status: 503 });
  }

  const result = await handleStripeBillingEvent(db, verified.event);
  return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    console.error(JSON.stringify({ event: 'stripe_webhook_failed', detail: message }));
    return Response.json({ error: 'WEBHOOK_HANDLER_FAILED', message }, { status: 500 });
  }
}

/**
 * @param {string | string[] | undefined} pathParam
 */
function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map(String).join('/');
  return pathParam ? String(pathParam) : '';
}
