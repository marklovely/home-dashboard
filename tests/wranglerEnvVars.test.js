import { describe, expect, it } from 'vitest';
import { dedupeEnvVarsBlock, upsertEnvVar } from '../scripts/lib/wrangler-env-vars.mjs';

const sample = `
[env.demo]
name = "lovely-home-hub-api-demo"

[env.demo.vars]
HUB_ENVIRONMENT = "demo"
ALLOWED_ORIGINS = "https://demo.example.com"

[[env.demo.r2_buckets]]
binding = "GUIDE_MEDIA"
bucket_name = "demo-media"
`;

describe('wrangler-env-vars', () => {
  it('upserts vars within the full [env.site.vars] block', () => {
    const next = upsertEnvVar(sample, 'demo', 'ACCESS_WORKER_APP_ID', 'worker-123');
    expect(next).toContain('ACCESS_WORKER_APP_ID = "worker-123"');
    expect(next).toContain('HUB_ENVIRONMENT = "demo"');
    expect(next).toContain('ALLOWED_ORIGINS = "https://demo.example.com"');
    expect(next.match(/ACCESS_WORKER_APP_ID/g)).toHaveLength(1);
  });

  it('replaces an existing key instead of appending a duplicate', () => {
    const withKey = upsertEnvVar(sample, 'demo', 'ACCESS_WORKER_APP_ID', 'first');
    const next = upsertEnvVar(withKey, 'demo', 'ACCESS_WORKER_APP_ID', 'second');
    expect(next.match(/ACCESS_WORKER_APP_ID/g)).toHaveLength(1);
    expect(next).toContain('ACCESS_WORKER_APP_ID = "second"');
  });

  it('dedupes duplicate keys keeping the last value', () => {
    const broken = `
[env.demo.vars]
ACCESS_WORKER_APP_ID = "old"
ACCESS_PAGES_APP_ID = "pages-old"
ACCESS_WORKER_APP_ID = "new"
ACCESS_PAGES_APP_ID = "pages-new"
HUB_ENVIRONMENT = "demo"

[[env.demo.r2_buckets]]
binding = "GUIDE_MEDIA"
`;
    const next = dedupeEnvVarsBlock(broken, 'demo');
    expect(next).toContain('[env.demo.vars]\nACCESS_WORKER_APP_ID = "new"');
    expect(next.match(/ACCESS_WORKER_APP_ID/g)).toHaveLength(1);
    expect(next).toContain('ACCESS_WORKER_APP_ID = "new"');
    expect(next).toContain('ACCESS_PAGES_APP_ID = "pages-new"');
    expect(next).toContain('HUB_ENVIRONMENT = "demo"');
  });
});
