/**
 * @param {Date} date
 * @returns {string} YYYY-MM-DD in local time
 */
export function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} sitStart YYYY-MM-DD
 * @param {Date} [referenceDate]
 */
export function isSitInProgress(sitStart, referenceDate = new Date()) {
  return localIsoDate(referenceDate) >= sitStart.trim();
}

/**
 * @param {{ hasPets?: boolean, name?: string } | null | undefined} petCare
 */
function thankYouLead(petCare) {
  if (
    petCare &&
    typeof petCare === 'object' &&
    petCare.hasPets &&
    String(petCare.name ?? '').trim()
  ) {
    return `Thank you for looking after our home and ${String(petCare.name).trim()}.`;
  }
  return 'Thank you for looking after our home.';
}

/**
 * @param {{ sitStart: string, sitEnd: string } | null | undefined} myStay
 * @param {{ hasPets?: boolean, name?: string } | null | undefined} petCare
 * @param {(isoDate: string) => string} formatDate
 * @param {Date} [referenceDate]
 * @returns {{ lead: string, body: string | null }}
 */
export function buildSitterWelcomeCopy(myStay, petCare, formatDate, referenceDate = new Date()) {
  if (myStay && !isSitInProgress(myStay.sitStart, referenceDate)) {
    return {
      lead: `Your sit begins on ${formatDate(myStay.sitStart)} and ends on ${formatDate(myStay.sitEnd)}. We are looking forward to welcoming you.`,
      body: null
    };
  }

  return {
    lead: thankYouLead(petCare),
    body: "Everything you'll need during your stay is below."
  };
}
