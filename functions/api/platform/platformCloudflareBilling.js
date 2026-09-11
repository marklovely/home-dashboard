import {
  cloudflareApiGet,
  cloudflareUsageApiConfigured,
  resolveCloudflareAccountId
} from './platformCloudflareUsage.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */

/**
 * @param {Date} [now]
 */
export function currentMonthBillableUsageRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month, now.getUTCDate()));
  const format = (date) => date.toISOString().slice(0, 10);
  return {
    from: format(from),
    to: format(to),
    label: from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  };
}

/**
 * @param {unknown} row
 */
export function billableUsageRowLabel(row) {
  if (!row || typeof row !== 'object') return 'Unknown';
  /** @type {Record<string, unknown>} */
  const record = row;
  const metric =
    String(record.x_BillableMetricName ?? record.BillableMetricName ?? '').trim() ||
    String(record.ChargeDescription ?? '').trim();
  if (metric) return metric;
  return String(record.ServiceName ?? record.x_ServiceName ?? 'Cloudflare usage').trim();
}

/**
 * @param {unknown} row
 */
export function billableUsageRowCost(row) {
  if (!row || typeof row !== 'object') return 0;
  /** @type {Record<string, unknown>} */
  const record = row;
  const billed = Number(record.BilledCost ?? record.ContractedCost ?? record.CumulatedContractedCost);
  return Number.isFinite(billed) ? billed : 0;
}

/**
 * @param {unknown} row
 */
export function billableUsageRowQuantity(row) {
  if (!row || typeof row !== 'object') return null;
  /** @type {Record<string, unknown>} */
  const record = row;
  const quantity = Number(record.PricingQuantity ?? record.ConsumedQuantity);
  const unit = String(record.ConsumedUnit ?? record.PricingUnit ?? '').trim();
  if (!Number.isFinite(quantity)) return null;
  return { quantity, unit: unit || null };
}

/**
 * @param {unknown[]} rows
 */
export function summarizeBillableUsageRows(rows) {
  /** @type {Map<string, { label: string, cost: number, quantity: number | null, unit: string | null }>} */
  const byLabel = new Map();
  let totalCost = 0;
  let currency = 'GBP';

  for (const row of rows) {
    const label = billableUsageRowLabel(row);
    const cost = billableUsageRowCost(row);
    const quantityInfo = billableUsageRowQuantity(row);
    totalCost += cost;

    if (row && typeof row === 'object') {
      const record = /** @type {Record<string, unknown>} */ (row);
      const rowCurrency = String(record.BillingCurrency ?? record.PricingCurrency ?? '').trim();
      if (rowCurrency) currency = rowCurrency;
    }

    const existing = byLabel.get(label) ?? {
      label,
      cost: 0,
      quantity: quantityInfo?.quantity ?? null,
      unit: quantityInfo?.unit ?? null
    };
    existing.cost += cost;
    if (quantityInfo?.quantity != null) {
      existing.quantity = (existing.quantity ?? 0) + quantityInfo.quantity;
      existing.unit = quantityInfo.unit ?? existing.unit;
    }
    byLabel.set(label, existing);
  }

  const products = [...byLabel.values()]
    .sort((a, b) => b.cost - a.cost || a.label.localeCompare(b.label))
    .map((row) => ({
      label: row.label,
      cost: row.cost,
      quantity: row.quantity,
      unit: row.unit
    }));

  return {
    totalCost,
    currency,
    productCount: products.length,
    products
  };
}

/**
 * @param {number} amount
 * @param {string} currency
 */
export function formatBillableCost(amount, currency = 'GBP') {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * @param {string} accountId
 * @param {PlatformEnv} env
 * @param {{ from?: string, to?: string }} [range]
 */
export async function fetchAccountBillableUsage(accountId, env, range = currentMonthBillableUsageRange()) {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const query = params.toString();
  const suffix = query ? `?${query}` : '';

  const paths = [
    `/accounts/${encodeURIComponent(accountId)}/billable/usage${suffix}`,
    `/accounts/${encodeURIComponent(accountId)}/billable-usage${suffix}`
  ];

  let lastError = '';
  for (const path of paths) {
    try {
      const result = await cloudflareApiGet(path, env);
      const rows = Array.isArray(result) ? result : [];
      return {
        ok: true,
        rows,
        summary: summarizeBillableUsageRows(rows),
        range,
        apiPath: path.split('?')[0]
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (!/not found|404|unknown/i.test(lastError)) {
        break;
      }
    }
  }

  const permissionHint = /auth|permission|forbidden|403/i.test(lastError)
    ? ' Add Billing: Read to PLATFORM_CF_API_TOKEN (Account → Billing → Read).'
    : '';

  return {
    ok: false,
    error: 'CF_BILLING_API_ERROR',
    message: `${lastError || 'Could not load Cloudflare billable usage.'}${permissionHint}`,
    range
  };
}

/**
 * @param {string} accountId
 * @param {PlatformEnv} env
 */
export async function fetchAccountBillableUsageInfo(accountId, env) {
  const paths = [
    `/accounts/${encodeURIComponent(accountId)}/billable-usage/info`,
    `/accounts/${encodeURIComponent(accountId)}/billable/usage/info`
  ];

  for (const path of paths) {
    try {
      const result = await cloudflareApiGet(path, env);
      return {
        ok: true,
        covered: result?.covered === true,
        subscriptions: Array.isArray(result?.subscriptions) ? result.subscriptions : []
      };
    } catch {
      // try next path
    }
  }

  return { ok: false, covered: null, subscriptions: [] };
}

/**
 * @param {object} manifest
 * @param {PlatformEnv} env
 */
export async function fetchCloudflareBillingSummary(manifest, env) {
  if (!cloudflareUsageApiConfigured(env)) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message:
        'Set PLATFORM_CF_API_TOKEN and CLOUDFLARE_ACCOUNT_ID on the platform Pages project to load Cloudflare costs.'
    };
  }

  const platform = manifest.platform ?? {};
  const accountId = resolveCloudflareAccountId(env, platform);
  if (!accountId) {
    return {
      ok: false,
      error: 'NO_ACCOUNT_ID',
      message: 'Cloudflare account ID is missing from platform env or manifest.'
    };
  }

  const range = currentMonthBillableUsageRange();
  const [usage, info] = await Promise.all([
    fetchAccountBillableUsage(accountId, env, range),
    fetchAccountBillableUsageInfo(accountId, env)
  ]);

  return {
    checkedAt: new Date().toISOString(),
    accountId,
    range,
    usage,
    info,
    dashboardUrl: `https://dash.cloudflare.com/${accountId}/billing/subscriptions`
  };
}
