/**
 * Writes website/help-data.js from the hub help modules so the static
 * marketing site can ship the same owner and guest guides.
 *
 *   npm run build:website-help
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublicHelpCatalog, serializePublicHelpCatalog } from '../src/help/publicCatalog.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(projectRoot, 'website/help-data.js');

writeFileSync(outPath, serializePublicHelpCatalog(buildPublicHelpCatalog()));
console.log(`Wrote ${outPath}`);
