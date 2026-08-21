import { describe, expect, it } from 'vitest';
import { findBestGuideTopic, getGuideHomeSummary, searchGuideTopics } from '../src/services/guideService.js';
import {
  guideHaystackMatches,
  searchTopicsInCatalog
} from '../src/content/houseguide/providers/jsonGuideProvider.js';
import { highlightGuideText } from '../src/widgets/HouseGuide/highlight.js';

describe('guideHaystackMatches and reorder helpers', () => {
  it('moves list items for drag reorder', async () => {
    const { moveItem } = await import('../src/apps/HouseGuideEditor/guideEditorReorder.js');
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('syncReorderRowIndices updates data attributes from DOM order', async () => {
    const { syncReorderRowIndices } = await import('../src/apps/HouseGuideEditor/guideEditorReorder.js');
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-reorder-row data-block-index="0">A</div>
      <div data-reorder-row data-block-index="1">B</div>
    `;
    container.insertBefore(container.lastElementChild, container.firstElementChild);
    syncReorderRowIndices(container);
    const rows = [...container.querySelectorAll('[data-reorder-row]')];
    expect(rows[0]?.textContent).toBe('B');
    expect(rows[0]?.dataset.blockIndex).toBe('0');
    expect(rows[1]?.dataset.blockIndex).toBe('1');
  });
});

describe('guide service', () => {
  it('returns a meaningful home summary without document counts', () => {
    const summary = getGuideHomeSummary();
    expect(summary.title.toLowerCase()).not.toContain('markdown');
    expect(summary.title).not.toMatch(/\d+\s+guide/i);
    expect(summary.subtitle).toBe('Appliances • Wi-Fi • Scooter');
  });

  it('finds TV when searching television or Netflix', () => {
    expect(searchGuideTopics('television')[0]?.id).toBe('streaming-services');
    expect(searchGuideTopics('Netflix')[0]?.id).toBe('streaming-services');
  });

  it('finds Wi-Fi connecting topic for wifi', () => {
    expect(searchGuideTopics('wifi')[0]?.id).toBe('connecting');
  });

  it('surfaces Nest heating immediately', () => {
    expect(findBestGuideTopic('heating')?.id).toBe('nest-heating');
  });

  it('highlights matched substrings in titles', () => {
    expect(highlightGuideText('Heating', 'heat')).toContain('<mark class="guide-search-mark">');
  });

  it('matches custom topic keywords including postcodes', () => {
    const hits = searchTopicsInCatalog(
      {
        version: 2,
        homeSummaryTitle: 'Guide',
        homeSummarySubtitle: '',
        categories: [
          {
            id: 'arrival',
            title: 'Arrival',
            cardSubtitle: 'Getting here',
            iconId: 'map-pin',
            accent: '#fff',
            topics: [
              {
                id: 'finding-us',
                title: 'Finding Us',
                subtitle: 'Directions',
                summary: 'How to find the house',
                searchTerms: ['PO8 9ZZ', 'wagtail road'],
                blocks: []
              }
            ]
          }
        ]
      },
      'PO8 9ZZ'
    );
    expect(hits[0]?.id).toBe('finding-us');
    expect(guideHaystackMatches('po8 9zz', 'PO89ZZ')).toBe(true);
  });
});

describe('guide quick action validation', () => {
  it('accepts bedtime plus navigate quick actions', async () => {
    const { validateGuideActions, normalizeGuideActionsForSave } = await import(
      '../src/apps/HouseGuideEditor/guideEditorActions.js'
    );
    const actions = [
      { type: 'alexa', buttonId: 2, label: 'Alexa bedtime routine' },
      { type: 'navigate', topicId: 'test-topic', label: 'Test' }
    ];
    expect(validateGuideActions(actions)).toBeNull();
    expect(normalizeGuideActionsForSave(actions)).toEqual(actions);
  });

  it('reports missing topic links clearly', async () => {
    const { validateGuideActions } = await import('../src/apps/HouseGuideEditor/guideEditorActions.js');
    expect(
      validateGuideActions([{ type: 'navigate', topicId: '', label: 'Test' }])
    ).toContain('choose a topic to open');
  });
});
