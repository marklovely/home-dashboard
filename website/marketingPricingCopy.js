const DEFAULT_API = 'https://platform.lovely-home.co.uk';

/**
 * @param {string} [apiBaseOverride]
 */
export function resolveMarketingApiBase(apiBaseOverride) {
  if (apiBaseOverride) return apiBaseOverride.replace(/\/$/, '');
  const meta = document.querySelector('meta[name="lovely-platform-api"]');
  return (meta?.content || DEFAULT_API).replace(/\/$/, '');
}

/**
 * @param {string} [apiBaseOverride]
 */
export async function fetchMarketingPricingCopy(apiBaseOverride) {
  const apiBase = resolveMarketingApiBase(apiBaseOverride);
  try {
    const response = await fetch(apiBase + '/api/public/signup/pricing', {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('pricing unavailable');
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} pricing
 */
export function buildPlaceholderMap(pricing) {
  const displayCopy =
    pricing?.displayCopy && typeof pricing.displayCopy === 'object'
      ? /** @type {Record<string, unknown>} */ (pricing.displayCopy)
      : {};
  const referral =
    pricing?.referral && typeof pricing.referral === 'object'
      ? /** @type {Record<string, unknown>} */ (pricing.referral)
      : {};
  const intro =
    pricing?.introOffer && typeof pricing.introOffer === 'object'
      ? /** @type {Record<string, unknown>} */ (pricing.introOffer)
      : {};
  const billingTrialDays =
    displayCopy.billingTrialDays ?? pricing?.billingTrialDays ?? pricing?.trialDays ?? 7;

  return {
    billingTrialDays: String(billingTrialDays),
    trialDays: String(displayCopy.trialDays ?? pricing?.trialDays ?? billingTrialDays),
    monthlyLabel: String(displayCopy.monthlyLabel ?? pricing?.monthlyLabel ?? ''),
    yearlyLabel: String(displayCopy.yearlyLabel ?? pricing?.yearlyLabel ?? ''),
    introMonthlyBenefit: String(displayCopy.introMonthlyBenefit ?? intro.monthlyBenefit ?? ''),
    introYearlyBenefit: String(displayCopy.introYearlyBenefit ?? intro.yearlyBenefit ?? ''),
    referralMonthlyReferee: String(displayCopy.referralMonthlyReferee ?? referral.monthlyReferee ?? ''),
    referralYearlyReferee: String(displayCopy.referralYearlyReferee ?? referral.yearlyReferee ?? ''),
    referralMonthlyReferrer: String(
      displayCopy.referralMonthlyReferrer ?? referral.monthlyReferrer ?? ''
    ),
    referralYearlyReferrer: String(displayCopy.referralYearlyReferrer ?? referral.yearlyReferrer ?? '')
  };
}

/**
 * @param {string} text
 * @param {Record<string, unknown> | null | undefined} pricing
 */
export function substituteMarketingPlaceholders(text, pricing) {
  const map = buildPlaceholderMap(pricing);
  return String(text ?? '').replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(map, key) && map[key] ? map[key] : match;
  });
}

/**
 * @param {string} fullText
 */
export function referralPlanShortLabel(fullText) {
  const trimmed = String(fullText ?? '').trim();
  if (!trimmed) return '';
  const beforeParen = trimmed.split('(')[0].trim();
  return beforeParen || trimmed;
}

/**
 * @param {Record<string, unknown> | null | undefined} pricing
 */
export function buildPricingMetaDescription(pricing) {
  const map = buildPlaceholderMap(pricing);
  if (!map.monthlyLabel || !map.yearlyLabel) return '';
  return (
    'Lovely Home pricing — Free forever for one home, or Lovely Home+ from ' +
    map.monthlyLabel +
    ' or ' +
    map.yearlyLabel +
    ' for unlimited guides and scheduled stays.'
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} pricing
 */
export function billingTrialDays(pricing) {
  const map = buildPlaceholderMap(pricing);
  const parsed = Number(map.billingTrialDays);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

/**
 * @param {unknown} block
 * @param {Record<string, unknown> | null | undefined} pricing
 */
function substituteHelpBlock(block, pricing) {
  if (!block || typeof block !== 'object') return block;
  const next = /** @type {Record<string, unknown>} */ ({ ...block });
  if (typeof next.text === 'string') next.text = substituteMarketingPlaceholders(next.text, pricing);
  if (typeof next.question === 'string') {
    next.question = substituteMarketingPlaceholders(next.question, pricing);
  }
  if (typeof next.answer === 'string') {
    next.answer = substituteMarketingPlaceholders(next.answer, pricing);
  }
  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => substituteMarketingPlaceholders(String(item), pricing));
  }
  if (Array.isArray(next.rows)) {
    next.rows = next.rows.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => substituteMarketingPlaceholders(String(cell), pricing))
        : row
    );
  }
  return next;
}

/**
 * @param {{ owner: unknown[], sitter: unknown[] }} catalog
 * @param {Record<string, unknown> | null | undefined} pricing
 */
export function substituteHelpCatalogPricing(catalog, pricing) {
  const mapSection = (section) => ({
    ...section,
    blocks: Array.isArray(section.blocks)
      ? section.blocks.map((block) => substituteHelpBlock(block, pricing))
      : []
  });
  return {
    owner: Array.isArray(catalog.owner) ? catalog.owner.map(mapSection) : [],
    sitter: Array.isArray(catalog.sitter) ? catalog.sitter.map(mapSection) : []
  };
}
