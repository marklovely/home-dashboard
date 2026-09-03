import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { terraformCloudflareRetryDecision } from '../scripts/lib/terraform-cloudflare-retry.mjs';

describe('terraformCloudflareRetryDecision', () => {
  it('does not retry D1 databases-per-account 403', () => {
    const output = `Error: failed to make http request
403 Forbidden
{"errors":[{"code":7406,"message":"System limit reached: databases per account (10)"}]}
`;
    const decision = terraformCloudflareRetryDecision(output);
    expect(decision.retry).toBe(false);
    expect(decision.message).toMatch(/account limit/i);
  });

  it('does not retry a generic Cloudflare 403', () => {
    expect(terraformCloudflareRetryDecision('POST ... 403 Forbidden').retry).toBe(false);
  });

  it('does not retry 401 Unauthorized', () => {
    expect(terraformCloudflareRetryDecision('401 Unauthorized').retry).toBe(false);
  });

  it('retries a 429 rate limit', () => {
    expect(terraformCloudflareRetryDecision('Error: 429 Too Many Requests').retry).toBe(true);
  });

  it('does not retry an Access app that already exists', () => {
    expect(
      terraformCloudflareRetryDecision(
        '409 Conflict {"errors":[{"code":11010,"message":"access.api.error.application_already_exists"}]}'
      ).retry
    ).toBe(false);
  });

  it('does not retry non-empty R2 bucket delete conflicts', () => {
    const decision = terraformCloudflareRetryDecision(
      '409 Conflict {"errors":[{"code":10008,"message":"The bucket you tried to delete (lovely-home-guide-media-smith) is not empty (account abc)."}]}'
    );
    expect(decision.retry).toBe(false);
    expect(decision.message).toMatch(/not empty/i);
  });

  it('retries other apply failures so transient HTTP can recover', () => {
    expect(terraformCloudflareRetryDecision('Error: failed to make http request').retry).toBe(true);
  });

  it('is used by provision and deprovision hub scripts', () => {
    const provision = readFileSync(join(process.cwd(), 'scripts/provision-hub-site.mjs'), 'utf8');
    const deprovision = readFileSync(join(process.cwd(), 'scripts/deprovision-hub-site.mjs'), 'utf8');
    expect(provision).toContain('terraformCloudflareRetryDecision');
    expect(deprovision).toContain('terraformCloudflareRetryDecision');
  });
});
