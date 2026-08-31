/**
 * CHANGELOG.md helpers for tagged GitHub releases.
 * Headings are `## Unreleased` / `## 2.3.0`. `###` subsections stay inside a section.
 */

/**
 * @param {string} heading
 */
function escapeHeading(heading) {
  return String(heading).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} markdown
 * @param {string} heading
 * @returns {string}
 */
function changelogSection(markdown, heading) {
  const match = new RegExp(`(?:^|\\n)## ${escapeHeading(heading)}[ \\t]*\\n`).exec(markdown);
  if (!match) return '';
  const rest = markdown.slice(match.index + match[0].length);
  const next = rest.search(/\n## /);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/**
 * @param {string} markdown
 * @param {string} version
 * @returns {string}
 */
export function changelogNotesForVersion(markdown, version) {
  return changelogSection(markdown, version);
}

/**
 * @param {string} markdown
 * @returns {string}
 */
export function changelogUnreleasedNotes(markdown) {
  return changelogSection(markdown, 'Unreleased');
}

/**
 * @param {string} markdown
 * @param {string} version
 * @param {string} notes
 * @returns {string}
 */
export function promoteChangelogUnreleased(markdown, version, notes) {
  const body = notes.trim();
  if (!body) {
    throw new Error('CHANGELOG Unreleased is empty — add notes before cutting a release.');
  }
  if (changelogNotesForVersion(markdown, version)) {
    throw new Error(`CHANGELOG already has a ${version} section.`);
  }
  return markdown.replace(
    /(^|\n)## Unreleased[ \t]*\n+[\s\S]*?(?=\n## )/,
    `$1## Unreleased\n\n## ${version}\n\n${body}\n`
  );
}
