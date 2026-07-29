/**
 * Repair common Apple/iCloud ICS quirks before parsing.
 * @param {string} icsText
 */
export function normalizeIcsText(icsText) {
  let text = icsText.replace(/\uFEFF/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // RFC 5545 line unfolding (continuation lines begin with space or tab).
  text = text.replace(/\n[ \t]/g, '');

  /** @type {string[]} */
  const fixed = [];
  const propertyLine = /^[A-Za-z0-9-]+(?:;[^:]*)*:/;
  const componentLine = /^(BEGIN|END):/;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const trimmed = line.trim();
    const isProperty = propertyLine.test(trimmed) || componentLine.test(trimmed);

    if (!isProperty && fixed.length > 0) {
      fixed[fixed.length - 1] += ` ${trimmed}`;
      continue;
    }

    fixed.push(trimmed);
  }

  return `${fixed.join('\r\n')}\r\n`;
}
