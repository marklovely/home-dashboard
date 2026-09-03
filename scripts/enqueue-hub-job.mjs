/**
 * Send a hub job onto a Cloudflare Queue (GitHub Actions → registry/provision handoff).
 *
 * Usage:
 *   node scripts/enqueue-hub-job.mjs --queue provision --action provision --site-id rose-cottage
 *   node scripts/enqueue-hub-job.mjs --queue registry --action record --site-id rose-cottage --ref platform/hub-record-rose-cottage
 */
import { hubJobHttpPushPayload } from './lib/hub-job-http-push.mjs';

const SITE_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
const QUEUE_NAMES = {
  provision: 'lovely-home-hub-provision',
  registry: 'lovely-home-hub-registry'
};

const args = parseArgs(process.argv.slice(2));
const queueKey = String(args.queue ?? '').trim();
const action = String(args.action ?? '').trim();
const siteId = String(args['site-id'] ?? '').trim();
const ref = String(args.ref ?? '').trim();
const queueName = QUEUE_NAMES[queueKey];

if (!queueName || !action || !SITE_ID_RE.test(siteId)) {
  console.error(
    'Usage: node scripts/enqueue-hub-job.mjs --queue provision|registry --action <action> --site-id <id> [--ref <branch>]'
  );
  process.exit(1);
}
if ((action === 'record' || action === 'drop') && !ref) {
  console.error('Registry jobs require --ref (snapshot branch).');
  process.exit(1);
}

const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID ?? '').trim();
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN ?? '').trim();
if (!accountId || !apiToken) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required to enqueue hub jobs.');
  process.exit(1);
}

try {
  const queueId = await findQueueId(accountId, apiToken, queueName);
  const body = { siteId, action, ...(ref ? { ref } : {}) };
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hubJobHttpPushPayload(body))
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`Queue send failed (${response.status}). ${detail.slice(0, 400)}`);
    process.exit(1);
  }

  console.log(`Enqueued ${action} for ${siteId} on ${queueName}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

/**
 * @param {string} accountIdValue
 * @param {string} token
 * @param {string} name
 */
async function findQueueId(accountIdValue, token, name) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountIdValue}/queues`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Could not list Cloudflare queues (${response.status}). ${detail.slice(0, 200)}`);
  }
  const payload = await response.json();
  const queues = Array.isArray(payload.result) ? payload.result : [];
  const match = queues.find((entry) => entry?.queue_name === name || entry?.name === name);
  const id = String(match?.queue_id ?? match?.id ?? '').trim();
  if (!id) {
    throw new Error(`Queue ${name} was not found. Apply the platform Terraform stack first.`);
  }
  return id;
}
