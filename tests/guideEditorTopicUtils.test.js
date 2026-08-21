import { describe, expect, it } from 'vitest';
import {
  buildTopicPatch,
  isTopicDirty,
  mediaIdFromFileName,
  serializeTopicForCompare,
  slugFromTitle
} from '../src/apps/HouseGuideEditor/guideEditorTopicUtils.js';

describe('guideEditorTopicUtils', () => {
  it('slugFromTitle normalizes titles', () => {
    expect(slugFromTitle('Bin Day & Recycling')).toBe('bin-day-recycling');
    expect(slugFromTitle('  Scooter Bedtime!  ')).toBe('scooter-bedtime');
  });

  it('mediaIdFromFileName strips extensions', () => {
    expect(mediaIdFromFileName('Front-Door.jpg')).toBe('front-door');
  });

  it('isTopicDirty compares serialized topic patches', () => {
    const topic = {
      id: 'wifi',
      title: 'Wi‑Fi',
      subtitle: 'Network',
      summary: 'How to connect',
      audience: 'guest',
      searchTerms: [],
      applianceManualTerms: [],
      actions: [],
      blocks: [{ type: 'text', content: 'Hello' }]
    };
    const snapshot = serializeTopicForCompare(topic);
    expect(isTopicDirty(topic, snapshot)).toBe(false);
    expect(isTopicDirty({ ...topic, title: 'Wi-Fi updated' }, snapshot)).toBe(true);
    expect(buildTopicPatch(topic).audience).toBe('guest');
  });
});
