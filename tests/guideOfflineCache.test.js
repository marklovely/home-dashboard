import { describe, expect, it } from 'vitest';
import { listGuideMediaUrlsForCache } from '../src/services/guideOfflineCache.js';

describe('guideOfflineCache', () => {
  it('lists published catalog and uploaded media urls for caching', () => {
    const urls = listGuideMediaUrlsForCache({
      version: 2,
      homeSummaryTitle: 'Guide',
      homeSummarySubtitle: '',
      media: {
        'fuse-box': { file: 'fuse-box.jpg', alt: 'Fuse box' },
        'uploaded-photo': { file: 'uploaded-photo.jpg', alt: 'Tap', hasUpload: true }
      },
      categories: []
    });

    expect(urls).toContain('/api/house-guide/catalog');
    expect(urls.some((url) => url.includes('/api/house-guide/media/uploaded-photo/file'))).toBe(true);
    expect(urls.some((url) => url.includes('fuse-box'))).toBe(false);
  });
});
