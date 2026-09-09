import { describe, expect, it } from 'vitest';
import {
  mergeAccessDestinations,
  pagesDevHostname,
  pagesPreviewAccessDestinations
} from '../functions/api/platform/platformPagesPreviewAccess.js';

describe('platformPagesPreviewAccess', () => {
  it('builds pages.dev preview hostnames from the Pages project name', () => {
    expect(pagesDevHostname('home-dashboard-test-lovely')).toBe(
      'home-dashboard-test-lovely.pages.dev'
    );
    expect(pagesPreviewAccessDestinations('test-lovely.lovely-hub.com', 'home-dashboard-test-lovely')).toEqual([
      { type: 'public', uri: 'test-lovely.lovely-hub.com' },
      { type: 'public', uri: 'home-dashboard-test-lovely.pages.dev' },
      { type: 'public', uri: '*.home-dashboard-test-lovely.pages.dev' }
    ]);
  });

  it('merges preview destinations without dropping existing custom domains', () => {
    const merged = mergeAccessDestinations(
      [{ type: 'public', uri: 'test-lovely.lovely-hub.com' }],
      pagesPreviewAccessDestinations('test-lovely.lovely-hub.com', 'home-dashboard-test-lovely')
    );
    expect(merged.map((entry) => entry.uri)).toEqual([
      'test-lovely.lovely-hub.com',
      'home-dashboard-test-lovely.pages.dev',
      '*.home-dashboard-test-lovely.pages.dev'
    ]);
  });
});
