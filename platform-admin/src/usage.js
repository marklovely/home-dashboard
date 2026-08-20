import { formatUsageLine, usageTone } from './usageFormat.js';

/**
 * @param {Record<string, unknown>} usage
 */
export function renderSiteUsageSummary(usage) {
  if (!usage?.ok) {
    return `<span class="usage-line usage-muted">${escapeHtml(String(usage?.message ?? 'Usage unavailable'))}</span>`;
  }

  const d1Bytes = Number(usage.d1?.fileSizeBytes ?? 0);
  const d1Limit = Number(usage.d1?.limitBytes ?? 0);
  const r2Bytes = Number(usage.r2?.totalBytes ?? 0);
  const r2Limit = Number(usage.r2?.limitBytes ?? 0);
  const guidesCount = Number(usage.r2?.guides?.objectCount ?? 0);
  const mediaCount = Number(usage.r2?.media?.objectCount ?? 0);

  return `
    <div class="usage-grid">
      <div class="usage-metric usage-${usageTone(d1Bytes, d1Limit)}">
        <span class="usage-label">D1</span>
        <span class="usage-value">${escapeHtml(formatUsageLine(d1Bytes, d1Limit))}</span>
      </div>
      <div class="usage-metric usage-${usageTone(r2Bytes, r2Limit)}">
        <span class="usage-label">R2 (hub buckets)</span>
        <span class="usage-value">${escapeHtml(formatUsageLine(r2Bytes, r2Limit))}</span>
        <span class="usage-sub">${escapeHtml(`${guidesCount} guide PDFs · ${mediaCount} media objects`)}</span>
      </div>
    </div>
  `;
}

/**
 * @param {Record<string, unknown>} summary
 */
export function renderAccountUsageSummary(summary) {
  if (!summary?.ok) {
    return `<span class="summary-item usage-muted">${escapeHtml(String(summary?.message ?? 'Storage usage not configured'))}</span>`;
  }

  const r2Bytes = Number(summary.r2?.totalBytes ?? 0);
  const r2Limit = Number(summary.r2?.limitBytes ?? 0);
  const d1Bytes = Number(summary.d1?.totalBytes ?? 0);
  const d1Limit = Number(summary.d1?.limitBytes ?? 0);

  return `
    <span class="summary-item usage-${usageTone(r2Bytes, r2Limit)}">Account R2 <strong>${escapeHtml(formatUsageLine(r2Bytes, r2Limit))}</strong></span>
    <span class="summary-item usage-${usageTone(d1Bytes, d1Limit)}">Account D1 <strong>${escapeHtml(formatUsageLine(d1Bytes, d1Limit))}</strong></span>
  `;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
