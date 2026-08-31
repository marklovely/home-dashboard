import { describe, expect, it } from 'vitest';
import {
  buildPublicHubTrialStatus,
  publicHubTrialCorsHeaders,
  siteIdFromHubOrigin
} from '../functions/api/platform/platformPublicHubTrial.js';

describe('public hub trial status', () => {
  it('reads the site id from hub origins', () => {
    expect(siteIdFromHubOrigin('https://powell.lovely-hub.com')).toBe('powell');
    expect(siteIdFromHubOrigin('https://rose-cottage.lovely-hub.com/')).toBe('rose-cottage');
    expect(siteIdFromHubOrigin('https://demo.lovely-home.co.uk')).toBe('demo');
    expect(siteIdFromHubOrigin('https://dashboard.lovely-home.co.uk')).toBe('production');
    expect(siteIdFromHubOrigin('https://lovely-home.co.uk')).toBeNull();
    expect(siteIdFromHubOrigin('https://evil.example')).toBeNull();
  });

  it('allows CORS only for hub origins', () => {
    const allowed = publicHubTrialCorsHeaders(
      new Request('https://platform.lovely-home.co.uk/api/public/hub-trial-status', {
        headers: { Origin: 'https://powell.lovely-hub.com' }
      })
    );
    expect(allowed.siteId).toBe('powell');
    expect(allowed.headers['Access-Control-Allow-Origin']).toBe('https://powell.lovely-hub.com');

    const denied = publicHubTrialCorsHeaders(
      new Request('https://platform.lovely-home.co.uk/api/public/hub-trial-status', {
        headers: { Origin: 'https://lovely-home.co.uk' }
      })
    );
    expect(denied.siteId).toBeNull();
    expect(denied.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('treats live Stripe trials as trialing until trial_end', () => {
    const now = Date.parse('2026-08-31T12:00:00Z');
    expect(
      buildPublicHubTrialStatus({ status: 'trialing', trial_end: now + 86_400_000 }, now)
    ).toEqual({ trialing: true, trialEnd: now + 86_400_000 });
    expect(
      buildPublicHubTrialStatus({ status: 'trialing', trial_end: now - 1_000 }, now)
    ).toEqual({ trialing: false, trialEnd: null });
    expect(buildPublicHubTrialStatus({ status: 'active', trial_end: now + 1 }, now)).toEqual({
      trialing: false,
      trialEnd: null
    });
    expect(buildPublicHubTrialStatus(null, now)).toEqual({ trialing: false, trialEnd: null });
  });
});
