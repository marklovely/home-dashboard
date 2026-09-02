import {
  fetchSiteAccessProbe,
  fetchSiteHealth,
  getSiteFromManifest,
  loadPlatformManifest,
  requirePlatformOperator
} from './platformApi.js';
import {
  dispatchSiteDeployWorkflow,
  dispatchSiteManageWorkflow,
  dispatchSiteProvisionWorkflow,
  githubAutomationConfigured,
  githubRepo,
  listRecentWorkflowRuns
} from './platformGitHub.js';
import {
  buildSiteManagePayload,
  siteWizardSchema,
  validateSiteDeploy,
  validateSiteProvision
} from './platformSiteMutations.js';
import { platformHealthAuthConfigured } from './platformHealthFetch.js';
import {
  cloudflareUsageApiConfigured,
  fetchAccountStorageSummary,
  fetchSiteStorageUsage
} from './platformCloudflareUsage.js';
import {
  cloudflarePagesApiConfigured,
  fetchSitePagesPreviewStatus,
  setSitePagesPreviewEnabled
} from './platformPagesPreviews.js';
import {
  getMarketingAccess,
  updateMarketingAccess
} from './platformMarketingAccess.js';
import {
  createBillingCheckoutSession,
  defaultCheckoutUrls,
  getPlatformBillingDb,
  getSiteBilling,
  listSiteBilling,
  platformBillingDbConfigured,
  validateBillingSiteId
} from './platformBilling.js';
import { applyStripeMode, describeStripeMode } from './platformStripeMode.js';

/**
 * Platform operator API — /api/platform/*
 * Active only when PLATFORM_OPERATOR_EMAILS is set on the Pages project.
 *
 * @param {{ request: Request, env: Record<string, unknown>, params: { path?: string | string[] }, data?: unknown }} context
 */
export async function onRequest(context) {
  const { request, env, params, data } = context;
  const pagesEnv = /** @type {Record<string, string | undefined>} */ (env);

  const auth = await requirePlatformOperator(request, pagesEnv, data);
  if (!auth.ok) return auth.response;

  const suffix = normalizePath(params.path);

  let manifest;
  try {
    manifest = await loadPlatformManifest(request, env);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return Response.json(
      {
        error: 'MANIFEST_UNAVAILABLE',
        message: `Could not load platform-manifest.json (${detail}). Rebuild with npm run build:platform.`
      },
      { status: 503 }
    );
  }

  if (suffix === 'sites' && request.method === 'GET') {
    /** @type {Record<string, import('./platformBilling.js').SiteBillingRow>} */
    const billingBySite = {};
    const billingDb = getPlatformBillingDb(env);
    if (billingDb) {
      for (const row of await listSiteBilling(billingDb)) {
        billingBySite[row.site_id] = row;
      }
    }
    const stripe = await describeStripeMode(pagesEnv, billingDb);

    return Response.json({
      generatedAt: manifest.generatedAt,
      operator: auth.email,
      platform: manifest.platform ?? {},
      healthServiceAuthConfigured: platformHealthAuthConfigured(pagesEnv),
      cloudflareUsageConfigured: cloudflareUsageApiConfigured(pagesEnv),
      cloudflarePagesConfigured: cloudflarePagesApiConfigured(pagesEnv),
      githubAutomationConfigured: githubAutomationConfigured(pagesEnv),
      stripeBillingConfigured: stripe.stripeBillingConfigured,
      platformBillingDbConfigured: platformBillingDbConfigured(pagesEnv),
      stripeMode: stripe,
      billingBySite,
      sites: manifest.sites
    });
  }

  if (suffix === 'sites' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const siteId = String(body.siteId ?? '').trim();
    const built = buildSiteManagePayload(manifest, 'create', siteId, body);
    if (!built.ok) {
      return Response.json(built, { status: 400 });
    }
    const result = await dispatchSiteManageWorkflow(pagesEnv, 'create', built.payload);
    return Response.json(result, { status: result.ok ? 202 : 503 });
  }

  if (suffix === 'config' && request.method === 'GET') {
    const stripe = await describeStripeMode(pagesEnv, getPlatformBillingDb(env));
    return Response.json({
      healthServiceAuthConfigured: platformHealthAuthConfigured(pagesEnv),
      cloudflareUsageConfigured: cloudflareUsageApiConfigured(pagesEnv),
      cloudflarePagesConfigured: cloudflarePagesApiConfigured(pagesEnv),
      githubAutomationConfigured: githubAutomationConfigured(pagesEnv),
      stripeBillingConfigured: stripe.stripeBillingConfigured,
      platformBillingDbConfigured: platformBillingDbConfigured(pagesEnv),
      stripeMode: stripe,
      githubRepo: githubRepo(pagesEnv),
      hints: {
        healthServiceAuth:
          'Set PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID and PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET on home-dashboard-platform (terraform apply). Hub sites need non_identity service-token Access policies.',
        cloudflareUsage:
          'Set PLATFORM_CF_API_TOKEN (Account → Workers R2 Storage → Read) and CLOUDFLARE_ACCOUNT_ID on the platform Pages project to show D1/R2 usage per hub.',
        cloudflarePages:
          'Set PLATFORM_CF_API_TOKEN (Account → Cloudflare Pages → Edit) and CLOUDFLARE_ACCOUNT_ID on the platform Pages project to toggle PR preview builds per hub.',
        marketingAccess:
          'Set PLATFORM_CF_API_TOKEN with Access: Apps and Policies Edit to add OTP emails for lovely-home.co.uk from this dashboard.',
        githubAutomation:
          'Set PLATFORM_GITHUB_TOKEN (contents:write, actions:write, plus Variables write) and PLATFORM_GITHUB_REPO on the platform Pages project to enable site wizard automation.',
        stripeBilling:
          'Set STRIPE_SECRET_KEY (test) and optional STRIPE_*_LIVE vars on the platform Pages project. Switch Test/Live from this dashboard. Bind PLATFORM_BILLING_DB and apply platform/migrations (including 0007_platform_settings.sql). Webhook URL: POST /api/stripe/webhook (Access bypass on platform hostname).'
      }
    });
  }

  if (suffix === 'stripe/mode' && request.method === 'GET') {
    const stripe = await describeStripeMode(pagesEnv, getPlatformBillingDb(env));
    return Response.json(stripe);
  }

  if (suffix === 'stripe/mode' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const result = await applyStripeMode(pagesEnv, getPlatformBillingDb(env), body);
    return Response.json(result.body, { status: result.status });
  }

  if (suffix === 'billing' && request.method === 'GET') {
    const db = getPlatformBillingDb(env);
    if (!db) {
      return Response.json(
        { error: 'BILLING_DB_NOT_CONFIGURED', message: 'PLATFORM_BILLING_DB binding is missing.' },
        { status: 503 }
      );
    }
    return Response.json({ billing: await listSiteBilling(db) });
  }

  if (suffix === 'billing/checkout' && request.method === 'POST') {
    const billingDb = getPlatformBillingDb(env);
    const stripe = await describeStripeMode(pagesEnv, billingDb);
    if (!stripe.stripeBillingConfigured) {
      return Response.json(
        { error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe keys and price id are not set.' },
        { status: 503 }
      );
    }

    const body = await readJsonBody(request);
    const siteId = String(body.siteId ?? '').trim();
    const customerEmail = String(body.customerEmail ?? '').trim().toLowerCase();
    const siteIdError = validateBillingSiteId(siteId);
    if (siteIdError) {
      return Response.json({ error: 'INVALID_SITE_ID', message: siteIdError }, { status: 400 });
    }
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return Response.json(
        { error: 'INVALID_EMAIL', message: 'A valid customerEmail is required.' },
        { status: 400 }
      );
    }

    const site = getSiteFromManifest(manifest, siteId);
    if (!site) {
      return Response.json({ error: 'NOT_FOUND', message: `Unknown site: ${siteId}` }, { status: 404 });
    }

    if (billingDb) {
      const existing = await getSiteBilling(billingDb, siteId);
      if (existing && (existing.status === 'trialing' || existing.status === 'active')) {
        return Response.json(
          {
            error: 'BILLING_ALREADY_ACTIVE',
            message: `Site ${siteId} already has ${existing.status} billing.`,
            billing: existing
          },
          { status: 409 }
        );
      }
    }

    const platformHostname = String(manifest.platform?.hostname ?? pagesEnv.PLATFORM_HOSTNAME ?? 'platform.lovely-home.co.uk');
    const urls = defaultCheckoutUrls(pagesEnv, platformHostname);
    const successUrl = String(body.successUrl ?? urls.successUrl);
    const cancelUrl = String(body.cancelUrl ?? urls.cancelUrl);

    try {
      const session = await createBillingCheckoutSession(pagesEnv, {
        siteId,
        customerEmail,
        successUrl,
        cancelUrl,
        mode: stripe.mode
      });
      if (!session.ok) {
        return Response.json(session, { status: 503 });
      }
      return Response.json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout session failed.';
      return Response.json({ error: 'STRIPE_CHECKOUT_FAILED', message }, { status: 502 });
    }
  }

  const billingSiteMatch = suffix.match(/^billing\/sites\/([^/]+)$/);
  if (billingSiteMatch && request.method === 'GET') {
    const siteId = decodeURIComponent(billingSiteMatch[1]);
    const db = getPlatformBillingDb(env);
    if (!db) {
      return Response.json({ error: 'BILLING_DB_NOT_CONFIGURED' }, { status: 503 });
    }
    const billing = await getSiteBilling(db, siteId);
    if (!billing) {
      return Response.json({ error: 'NOT_FOUND', message: `No billing record for ${siteId}` }, { status: 404 });
    }
    return Response.json({ billing });
  }

  if (suffix === 'usage/summary' && request.method === 'GET') {
    return Response.json(await fetchAccountStorageSummary(manifest, pagesEnv));
  }

  if (suffix === 'marketing-access' && request.method === 'GET') {
    return Response.json(await getMarketingAccess(pagesEnv, manifest.platform ?? {}));
  }

  if (suffix === 'marketing-access' && (request.method === 'POST' || request.method === 'DELETE')) {
    const body = await readJsonBody(request);
    const email = String(body.email ?? '').trim();
    const result = await updateMarketingAccess(
      pagesEnv,
      manifest.platform ?? {},
      request.method === 'POST' ? 'add' : 'remove',
      email
    );
    const status = result.ok ? 200 : result.code === 'INVALID_EMAIL' || result.code === 'OPERATOR_LOCKED' ? 400 : 503;
    return Response.json(result, { status });
  }

  if (suffix === 'wizard/schema' && request.method === 'GET') {
    return Response.json({
      schema: siteWizardSchema(manifest),
      githubAutomationConfigured: githubAutomationConfigured(pagesEnv)
    });
  }

  if (suffix === 'automation/runs' && request.method === 'GET') {
    const result = await listRecentWorkflowRuns(pagesEnv);
    return Response.json(result, { status: result.ok ? 200 : 503 });
  }

  const siteMatch = suffix.match(/^sites\/([^/]+)(?:\/(.*))?$/);
  if (siteMatch) {
    const siteId = decodeURIComponent(siteMatch[1]);
    const action = siteMatch[2] ?? '';
    const site = getSiteFromManifest(manifest, siteId);

    if (request.method === 'PATCH' && !action) {
      const body = await readJsonBody(request);
      const built = buildSiteManagePayload(manifest, 'update', siteId, body);
      if (!built.ok) {
        return Response.json(built, { status: 400 });
      }
      const result = await dispatchSiteManageWorkflow(pagesEnv, 'update', built.payload);
      return Response.json(result, { status: result.ok ? 202 : 503 });
    }

    if (request.method === 'DELETE' && !action) {
      const body = await readJsonBody(request);
      const built = buildSiteManagePayload(manifest, 'delete', siteId, body);
      if (!built.ok) {
        return Response.json(built, { status: 400 });
      }
      const result = await dispatchSiteManageWorkflow(pagesEnv, 'delete', built.payload);
      return Response.json(result, { status: result.ok ? 202 : 503 });
    }

    if (request.method === 'POST' && action === 'provision') {
      const provisionCheck = validateSiteProvision(siteId, manifest);
      if (!provisionCheck.ok) {
        return Response.json(provisionCheck, {
          status: provisionCheck.error === 'NOT_FOUND' ? 404 : 400
        });
      }
      const result = await dispatchSiteProvisionWorkflow(pagesEnv, siteId);
      return Response.json(result, { status: result.ok ? 202 : 503 });
    }

    if (request.method === 'POST' && action === 'deploy') {
      const deployCheck = validateSiteDeploy(siteId, manifest);
      if (!deployCheck.ok) {
        return Response.json(deployCheck, { status: deployCheck.error === 'NOT_FOUND' ? 404 : 400 });
      }
      const result = await dispatchSiteDeployWorkflow(pagesEnv, siteId);
      return Response.json(result, { status: result.ok ? 202 : 503 });
    }

    if (action === 'previews') {
      if (!site) {
        return Response.json({ error: 'NOT_FOUND', message: `Unknown site: ${siteId}` }, { status: 404 });
      }
      if (request.method === 'GET') {
        return Response.json(await fetchSitePagesPreviewStatus(site, manifest.platform ?? {}, pagesEnv));
      }
      if (request.method === 'POST') {
        const body = await readJsonBody(request);
        const enabled = body.enabled === true;
        return Response.json(
          await setSitePagesPreviewEnabled(site, manifest.platform ?? {}, pagesEnv, enabled)
        );
      }
    }

    if (request.method === 'GET') {
      if (!site) {
        return Response.json({ error: 'NOT_FOUND', message: `Unknown site: ${siteId}` }, { status: 404 });
      }

      if (!action) {
        return Response.json({ site });
      }

      if (action === 'health') {
        return Response.json(await fetchSiteHealth(site, pagesEnv));
      }

      if (action === 'access-probe') {
        return Response.json(await fetchSiteAccessProbe(site, pagesEnv));
      }

      if (action === 'usage') {
        return Response.json(await fetchSiteStorageUsage(site, manifest.platform ?? {}, pagesEnv));
      }
    }
  }

  return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
}

/**
 * @param {string | string[] | undefined} pathParam
 */
function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.map(String).join('/');
  return pathParam ? String(pathParam) : '';
}

/**
 * @param {Request} request
 */
async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
