#!/usr/bin/env node
/**
 * Local dev API for platform-admin (mirrors platform-admin/functions routes).
 * Usage: node scripts/platform-admin-dev-api.mjs
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSiteFromManifest } from '../platform-admin/functions/lib/platformManifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'platform-admin/public/platform-manifest.json');
const port = Number(process.env.PLATFORM_ADMIN_API_PORT ?? 8791);
const operator = (process.env.PLATFORM_OPERATOR_EMAILS ?? 'dev@localhost').split(',')[0].trim();

/** @type {object} */
let manifest = { sites: {}, generatedAt: null };

function loadManifestFromDisk() {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
}

loadManifestFromDisk();

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const path = url.pathname.replace(/^\//, '');

  try {
    if (path === 'sites' && req.method === 'GET') {
      return json(res, { generatedAt: manifest.generatedAt, operator, sites: manifest.sites });
    }

    const match = path.match(/^sites\/([^/]+)(?:\/(.*))?$/);
    if (match && req.method === 'GET') {
      const siteId = decodeURIComponent(match[1]);
      const action = match[2] ?? '';
      const site = getSiteFromManifest(manifest, siteId);
      if (!site) return json(res, { error: 'NOT_FOUND' }, 404);
      if (!action) return json(res, { site });
      if (action === 'health') return json(res, await fetchSiteHealth(site));
      if (action === 'access-probe') return json(res, await fetchSiteAccessProbe(site));
    }

    json(res, { error: 'NOT_FOUND' }, 404);
  } catch (error) {
    json(res, { error: String(error) }, 500);
  }
});

server.listen(port, () => {
  console.log(`Platform admin dev API http://127.0.0.1:${port}`);
});

/**
 * @param {import('node:http').ServerResponse} res
 * @param {unknown} body
 * @param {number} [status]
 */
function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(`${JSON.stringify(body)}\n`);
}

/** @param {Record<string, unknown>} site */
async function fetchSiteHealth(site) {
  const origin = site.workerApiOrigin ?? site.pagesUrl;
  if (!origin) return { ok: false, error: 'NO_ORIGIN' };
  try {
    const response = await fetch(`${String(origin).replace(/\/$/, '')}/api/health`);
    return { ok: response.ok, status: response.status, body: await response.json() };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** @param {Record<string, unknown>} site */
async function fetchSiteAccessProbe(site) {
  const pagesUrl = site.pagesUrl;
  if (!pagesUrl) return { ok: false, error: 'NO_PAGES_URL' };
  try {
    const response = await fetch(`${String(pagesUrl).replace(/\/$/, '')}/api/access-probe`);
    return { ok: response.ok, status: response.status, body: await response.json() };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
