import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  hubRegistryLedgerCommitMessage,
  isHubRegistryLedgerCommit
} from '../scripts/lib/hub-registry-ledger.mjs';
import { hubJobHttpPushPayload } from '../scripts/lib/hub-job-http-push.mjs';
import { enqueueHubProvisionJob } from '../functions/api/platform/platformHubQueues.js';

describe('hub registry ledger commits', () => {
  it('names record and drop commits so yaml-push automation can ignore them', () => {
    expect(hubRegistryLedgerCommitMessage('record', 'rose-cottage')).toBe(
      'platform: record rose-cottage in site registry'
    );
    expect(hubRegistryLedgerCommitMessage('drop', 'rose-cottage')).toBe(
      'platform: drop rose-cottage from site registry'
    );
    expect(isHubRegistryLedgerCommit('platform: record rose-cottage in site registry')).toBe(true);
    expect(isHubRegistryLedgerCommit('platform: drop rose-cottage from site registry')).toBe(true);
    expect(isHubRegistryLedgerCommit('platform: add rose-cottage site')).toBe(false);
  });
});

describe('hub job HTTP push payload', () => {
  it('sends the job as a JSON object, not a stringified body', () => {
    const job = { siteId: 'rose-cottage', action: 'drop', ref: 'platform/hub-drop-rose-cottage' };
    expect(hubJobHttpPushPayload(job)).toEqual({ body: job });
    expect(typeof hubJobHttpPushPayload(job).body).toBe('object');
    const enqueue = readFileSync(resolve(process.cwd(), 'scripts/enqueue-hub-job.mjs'), 'utf8');
    expect(enqueue).toContain('hubJobHttpPushPayload');
    expect(enqueue).not.toContain('body: JSON.stringify(body)');
  });
});

describe('platform Pages queue producer', () => {
  it('sends provision jobs when the binding exists', async () => {
    const sent = [];
    const result = await enqueueHubProvisionJob(
      { HUB_PROVISION_QUEUE: { send: async (body) => sent.push(body) } },
      { siteId: 'rose-cottage', action: 'provision' }
    );
    expect(result.ok).toBe(true);
    expect(sent).toEqual([{ siteId: 'rose-cottage', action: 'provision' }]);
  });

  it('fails clearly when Terraform has not bound the queue yet', async () => {
    const result = await enqueueHubProvisionJob({}, { siteId: 'rose-cottage', action: 'provision' });
    expect(result).toMatchObject({ ok: false, error: 'QUEUE_NOT_CONFIGURED' });
  });
});

describe('hub job terraform', () => {
  it('creates both queues, the hub-jobs Worker, and Pages producer bindings', () => {
    const queues = readFileSync(
      resolve(process.cwd(), 'terraform/modules/platform_admin/queues.tf'),
      'utf8'
    );
    const worker = readFileSync(
      resolve(process.cwd(), 'terraform/modules/platform_admin/hub_jobs.tf'),
      'utf8'
    );
    const pages = readFileSync(
      resolve(process.cwd(), 'terraform/modules/platform_admin/pages.tf'),
      'utf8'
    );
    expect(queues).toContain('queue_name = local.hub_provision_queue_name');
    expect(queues).toContain('queue_name = local.hub_registry_queue_name');
    expect(queues).toMatch(/max_concurrency\s+= 4/);
    expect(queues).toMatch(/max_concurrency\s+= 1/);
    expect(queues).not.toContain('visibility_timeout_ms');
    expect(worker).toContain('lovely-home-hub-jobs');
    expect(pages).toContain('HUB_PROVISION_QUEUE');
    expect(pages).toContain('HUB_REGISTRY_QUEUE');
  });
});
