import {
  fetchSiteAccessProbe,
  fetchSiteHealth
} from './platformApi.js';
import { getPlatformBillingDb, listSiteBilling, platformBillingDbConfigured } from './platformBilling.js';
import {
  cloudflareUsageApiConfigured,
  D1_DATABASE_COUNT_LIMIT,
  fetchAccountResourceInventory,
  fetchAccountStorageSummary,
  FREE_TIER_LIMITS,
  resolveCloudflareAccountId
} from './platformCloudflareUsage.js';
import { githubAutomationConfigured, githubRepo, listRecentWorkflowRuns } from './platformGitHub.js';
import { getPublicPlanPricing } from './platformPublicPricing.js';
import { platformHealthAuthConfigured } from './platformHealthFetch.js';
import { cloudflarePagesApiConfigured } from './platformPagesPreviews.js';
import { countOpenBillingSubscriptions, describeStripeMode } from './platformStripeMode.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */

const OPEN_BILLING_STATUSES = new Set(['trialing', 'active', 'past_due', 'incomplete']);

/**
 * @param {Record<string, unknown> | undefined} site
 */
export function isPublicDemoSite(site) {
  if (!site) return false;
  return site.demoPublic === true || site.accessEnabled === false;
}

/**
 * @param {Record<string, unknown>} probe
 * @param {Record<string, unknown> | undefined} site
 */
export function isPublicDemoProbe(probe, site) {
  if (probe.body?.demoPublic === true) return true;
  return isPublicDemoSite(site);
}

/**
 * @param {Record<string, unknown>} health
 * @param {Record<string, unknown>} probe
 * @param {Record<string, unknown> | undefined} [site]
 */
export function evaluateSiteHealthForMonitoring(health, probe, site) {
  if (health.needsServiceAuth || probe.needsServiceAuth) {
    return { status: 'unknown', score: 0, checks: [] };
  }

  const publicDemo = isPublicDemoProbe(probe, site);
  const workerOk = health.ok === true && health.body?.status === 'ok';
  const bindingOk = probe.body?.usesHubApiBinding === true;
  const accessOk = publicDemo
    ? probe.ok === true
    : probe.body?.canForwardJwt === true || probe.body?.middlewareAccessValidated === true;

  const checks = [
    { id: 'worker', ok: workerOk, label: `Worker /api/health ${workerOk ? 'OK' : 'fail'}` },
    { id: 'hub-api', ok: bindingOk, label: `HUB_API binding ${bindingOk ? 'yes' : 'no'}` },
    {
      id: 'access-probe',
      ok: accessOk,
      label: publicDemo
        ? `Public demo gate ${accessOk ? 'OK' : 'check DEMO_PUBLIC on Pages'}`
        : `Access probe ${accessOk ? 'OK' : 'check Pages env'}`
    }
  ];

  const score = checks.filter((check) => check.ok).length;
  let status = 'bad';
  if (score === checks.length) status = 'healthy';
  else if (score > 0) status = 'degraded';

  return { status, score, checks, workerOk, bindingOk, accessOk, publicDemo };
}

/**
 * @param {import('./platformBilling.js').SiteBillingRow[]} rows
 */
export function summarizeBillingRows(rows) {
  /** @type {Record<string, number>} */
  const byStatus = {};
  let openCount = 0;

  for (const row of rows) {
    const status = String(row.status ?? 'unknown');
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    if (OPEN_BILLING_STATUSES.has(status)) openCount += 1;
  }

  return {
    total: rows.length,
    openCount,
    byStatus,
    rows: rows.map((row) => ({
      siteId: row.site_id,
      status: row.status,
      ownerEmail: row.owner_email,
      stripeSubscriptionId: row.stripe_subscription_id,
      updatedAt: row.updated_at
    }))
  };
}

/**
 * @param {Record<string, unknown>[]} hubDatabases
 * @param {Record<string, unknown>[]} accountDatabases
 */
export function matchHubDatabasesToAccount(hubDatabases, accountDatabases) {
  const accountIds = new Set(accountDatabases.map((row) => String(row.id ?? '')));
  const hubIds = hubDatabases.map((row) => String(row.databaseId ?? ''));
  const matched = hubIds.filter((id) => accountIds.has(id)).length;
  const orphanAccount = accountDatabases.filter(
    (row) => !hubIds.includes(String(row.id ?? ''))
  ).length;

  return {
    hubCount: hubIds.length,
    accountCount: accountDatabases.length,
    matchedOnAccount: matched,
    orphanOnAccount: orphanAccount,
    limit: D1_DATABASE_COUNT_LIMIT
  };
}

/**
 * @param {string} url
 * @param {number} [timeoutMs]
 */
export async function probeHttpEndpoint(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json, text/html;q=0.9, */*;q=0.8' }
    });
    const elapsedMs = Date.now() - started;
    const contentType = response.headers.get('content-type') ?? '';
    let body = null;
    if (contentType.includes('application/json')) {
      body = await response.json().catch(() => null);
    }
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      contentType,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} manifest
 * @param {PlatformEnv} env
 */
export async function buildMonitoringSummary(manifest, env) {
  const platform = manifest.platform ?? {};
  const billingDb = getPlatformBillingDb(env);
  const sites = Object.values(manifest.sites ?? {});

  const [
    storage,
    stripe,
    billingRows,
    openSubscriptions,
    workflowRuns,
    hubHealthRows
  ] = await Promise.all([
    fetchAccountStorageSummary(manifest, env),
    describeStripeMode(env, billingDb),
    billingDb ? listSiteBilling(billingDb) : Promise.resolve([]),
    countOpenBillingSubscriptions(billingDb),
    listRecentWorkflowRuns(env),
    Promise.all(
      sites.map(async (site) => {
        const siteId = String(site.siteId ?? '');
        const [health, probe] = await Promise.all([
          fetchSiteHealth(site, env),
          fetchSiteAccessProbe(site, env)
        ]);
        const evaluation = evaluateSiteHealthForMonitoring(health, probe, site);
        return {
          siteId,
          hostname: String(site.hostname ?? site.pagesUrl ?? ''),
          protected: site.protected === true,
          terraform: site.terraform === true,
          evaluation,
          healthStatus: health.ok ? Number(health.status) : null,
          probeStatus: probe.ok ? Number(probe.status) : null
        };
      })
    )
  ]);

  const accountId = resolveCloudflareAccountId(env, platform);
  let inventory = null;
  if (cloudflareUsageApiConfigured(env) && accountId) {
    try {
      inventory = await fetchAccountResourceInventory(accountId, env);
    } catch (error) {
      inventory = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  const platformHostname = String(platform.hostname ?? env.PLATFORM_HOSTNAME ?? 'platform.lovely-home.co.uk');
  const marketingOrigin = String(
    platform.marketingSiteOrigin ?? env.MARKETING_SITE_ORIGIN ?? 'https://lovely-home.co.uk'
  ).replace(/\/$/, '');

  const [marketingHome, pricingApi, signupStatus] = await Promise.all([
    probeHttpEndpoint(`${marketingOrigin}/`),
    probeHttpEndpoint(`https://${platformHostname}/api/public/signup/pricing`),
    probeHttpEndpoint(`https://${platformHostname}/api/public/signup/status`)
  ]);

  let pricingConfigured = null;
  try {
    const pricing = await getPublicPlanPricing(env);
    pricingConfigured = pricing.configured === true;
  } catch {
    pricingConfigured = false;
  }

  const hubDatabases = sites
    .filter((site) => site?.contract?.d1_database_id)
    .map((site) => ({
      siteId: String(site.siteId ?? ''),
      databaseId: String(site.contract.d1_database_id),
      databaseName: String(site.contract.d1_database_name ?? '')
    }));

  const d1Match =
    inventory?.d1?.databases
      ? matchHubDatabasesToAccount(hubDatabases, inventory.d1.databases)
      : {
          hubCount: hubDatabases.length,
          accountCount: null,
          matchedOnAccount: null,
          orphanOnAccount: null,
          limit: D1_DATABASE_COUNT_LIMIT
        };

  const healthCounts = { healthy: 0, degraded: 0, bad: 0, unknown: 0 };
  for (const row of hubHealthRows) {
    const status = row.evaluation.status;
    if (status in healthCounts) {
      healthCounts[/** @type {keyof typeof healthCounts} */ (status)] += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    manifestGeneratedAt: manifest.generatedAt ?? null,
    platform: {
      hostname: platformHostname,
      cloudflareAccountId: accountId || null,
      githubRepo: githubRepo(env)
    },
    integrations: {
      healthServiceAuthConfigured: platformHealthAuthConfigured(env),
      cloudflareUsageConfigured: cloudflareUsageApiConfigured(env),
      cloudflarePagesConfigured: cloudflarePagesApiConfigured(env),
      githubAutomationConfigured: githubAutomationConfigured(env),
      stripeBillingConfigured: stripe.stripeBillingConfigured,
      platformBillingDbConfigured: platformBillingDbConfigured(env)
    },
    overview: {
      siteCount: sites.length,
      terraformCount: sites.filter((site) => site.terraform).length,
      protectedCount: sites.filter((site) => site.protected).length,
      healthCounts,
      hubDatabases: hubDatabases.length
    },
    cloudflare: {
      storage,
      inventory,
      d1Match,
      freeTier: FREE_TIER_LIMITS,
      dashboardUrl: accountId ? `https://dash.cloudflare.com/${accountId}` : null
    },
    billing: {
      stripe,
      openSubscriptions,
      summary: summarizeBillingRows(billingRows),
      stripeDashboardUrl:
        stripe.mode === 'live'
          ? 'https://dashboard.stripe.com/dashboard'
          : 'https://dashboard.stripe.com/test/dashboard'
    },
    hubs: hubHealthRows,
    marketing: {
      origin: marketingOrigin,
      home: marketingHome,
      pricingApi: {
        ...pricingApi,
        configured: pricingConfigured
      },
      signupStatus
    },
    automation: workflowRuns,
    links: {
      cloudflare: accountId ? `https://dash.cloudflare.com/${accountId}` : null,
      cloudflareBilling: accountId
        ? `https://dash.cloudflare.com/${accountId}/billing/subscriptions`
        : null,
      cloudflareWorkers: accountId ? `https://dash.cloudflare.com/${accountId}/workers-and-pages` : null,
      cloudflareD1: accountId ? `https://dash.cloudflare.com/${accountId}/workers/d1` : null,
      cloudflareR2: accountId ? `https://dash.cloudflare.com/${accountId}/r2/overview` : null,
      stripe: stripe.mode === 'live' ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test',
      githubActions: githubRepo(env)
        ? `https://github.com/${githubRepo(env)}/actions`
        : null,
      marketingSite: marketingOrigin,
      platformAdmin: `https://${platformHostname}`
    }
  };
}
