import { describe, expect, it } from 'vitest';
import { pickCommittedCustomerHubFixture } from './lib/committedCustomerHubFixture.js';

describe('generate-hub-tfvars deprovision fallbacks', () => {
  it('manifest contract includes fields needed for deprovision tfvars', () => {
    const { siteId, contract, expected } = pickCommittedCustomerHubFixture();

    expect(contract.hostname, `${siteId} hostname`).toBe(expected.hostname);
    expect(contract.hub_environment, `${siteId} hub_environment`).toBe(expected.hub_environment);
    expect(contract.vanilla, `${siteId} vanilla`).toBe(expected.vanilla);
    expect(String(contract.worker_api_origin ?? ''), `${siteId} worker_api_origin`).toContain(
      expected.workerApiSubstr
    );
    expect(contract.r2_guides_bucket, `${siteId} r2_guides_bucket`).toBe(
      expected.r2_guides_bucket
    );
    expect(contract.r2_media_bucket, `${siteId} r2_media_bucket`).toBe(expected.r2_media_bucket);
  });
});
