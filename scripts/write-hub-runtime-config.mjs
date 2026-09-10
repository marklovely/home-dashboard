#!/usr/bin/env node
/**
 * Write runtime-config.json for a hub Pages deploy (per-site hub_environment).
 *
 * Usage: node scripts/write-hub-runtime-config.mjs --site-id larchmount --out dist/runtime-config.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSiteContract } from './lib/read-site-contract.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

/**
 * @param {string} siteId
 * @returns {string}
 */
export function hubEnvironmentForSite(siteId) {
  const error = validateSiteId(siteId);
  if (error) {
    throw new Error(error);
  }
  const resolved = readSiteContract(siteId);
  const hubEnvironment = String(resolved?.site?.hub_environment ?? siteId).trim();
  return hubEnvironment || siteId;
}

/**
 * @param {string} siteId
 * @returns {{ apiBaseUrl: string, hubEnvironment: string }}
 */
export function hubRuntimeConfigForSite(siteId) {
  return {
    apiBaseUrl: '',
    hubEnvironment: hubEnvironmentForSite(siteId)
  };
}

function parseArgs(argv) {
  /** @type {{ siteId?: string, out?: string }} */
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--site-id') {
      options.siteId = argv[index + 1]?.trim();
      index += 1;
    } else if (arg === '--out') {
      options.out = argv[index + 1]?.trim();
      index += 1;
    }
  }
  return options;
}

function main() {
  const { siteId, out } = parseArgs(process.argv.slice(2));
  if (!siteId || !out) {
    console.error('Usage: node scripts/write-hub-runtime-config.mjs --site-id <id> --out <path>');
    process.exit(1);
  }
  const payload = hubRuntimeConfigForSite(siteId);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${out} (hubEnvironment=${payload.hubEnvironment})`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
