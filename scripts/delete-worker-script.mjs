#!/usr/bin/env node
/**
 * Delete a Worker script via the Cloudflare API (avoids wrangler delete probing KV).
 *
 * Usage: node scripts/delete-worker-script.mjs <worker_name>
 */
const workerName = process.argv[2]?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

if (!workerName) {
  console.error('Usage: node scripts/delete-worker-script.mjs <worker_name>');
  process.exit(1);
}

if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}`;

console.log(`\n==> DELETE ${url}`);

const response = await fetch(url, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});

/** @type {{ success?: boolean, errors?: Array<{ code?: number, message?: string }> }} */
let body;
try {
  body = await response.json();
} catch {
  console.error(`Worker delete failed: non-JSON response (${response.status}).`);
  process.exit(1);
}

if (body.success) {
  console.log(`Deleted Worker script ${workerName}.`);
  process.exit(0);
}

const code = body.errors?.[0]?.code;
const message = body.errors?.[0]?.message ?? JSON.stringify(body.errors);
const output = `${message} ${JSON.stringify(body.errors ?? [])}`;

if (
  response.status === 404 ||
  code === 10007 ||
  /not found|does not exist|could not find|unknown script/i.test(output)
) {
  console.warn(`Worker ${workerName} already absent — continuing.`);
  process.exit(0);
}

console.error(`Worker delete failed (${code ?? response.status}): ${message}`);
process.exit(1);
