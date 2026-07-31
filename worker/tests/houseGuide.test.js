import { describe, expect, it } from 'vitest';
import { assembleGuideCatalog } from '../src/houseGuide/assembleCatalog.js';
import { sanitizeGuideActions } from '../src/houseGuide/sanitize.js';
import { createEmptyGuideBlock } from '../../src/apps/HouseGuideEditor/guideEditorBlockDefaults.js';

describe('assembleGuideCatalog', () => {
  it('builds published catalog for sitters', () => {
    const settings = {
      version: 2,
      home_summary_title: 'Welcome',
      home_summary_subtitle: 'Help'
    };
    const categories = [
      {
        id: 'kitchen',
        title: 'Kitchen',
        card_subtitle: 'Cook',
        icon_id: 'chef-hat',
        accent: '#fff',
        search_terms: '[]',
        sort_order: 0,
        published: 1
      }
    ];
    const topics = [
      {
        id: 'dishwasher',
        category_id: 'kitchen',
        title: 'Dishwasher',
        subtitle: 'Daily use',
        summary: 'Wash dishes',
        search_terms: '[]',
        appliance_manual_terms: null,
        blocks: JSON.stringify([{ type: 'text', content: 'Draft only' }]),
        published_blocks: JSON.stringify([{ type: 'text', content: 'Published copy' }]),
        actions: '[]',
        sort_order: 0,
        published: 1,
        has_draft: 1
      }
    ];

    const catalog = assembleGuideCatalog({}, settings, categories, topics, [], { publishedOnly: false });
    expect(catalog.categories[0]?.topics[0]?.blocks[0]?.content).toBe('Published copy');
    expect(catalog.draftCount).toBe(1);
  });

  it('filters owner-only topics from published catalog', () => {
    const settings = {
      version: 2,
      home_summary_title: 'Welcome',
      home_summary_subtitle: 'Help'
    };
    const categories = [
      {
        id: 'kitchen',
        title: 'Kitchen',
        card_subtitle: 'Cook',
        icon_id: 'chef-hat',
        accent: '#fff',
        search_terms: '[]',
        sort_order: 0,
        published: 1
      }
    ];
    const topics = [
      {
        id: 'dishwasher',
        category_id: 'kitchen',
        title: 'Dishwasher',
        subtitle: 'Daily use',
        summary: 'Wash dishes',
        search_terms: '[]',
        appliance_manual_terms: null,
        blocks: JSON.stringify([{ type: 'text', content: 'Guest copy' }]),
        published_blocks: JSON.stringify([{ type: 'text', content: 'Guest copy' }]),
        actions: '[]',
        sort_order: 0,
        published: 1,
        has_draft: 0,
        audience: 'guest'
      },
      {
        id: 'owner-notes',
        category_id: 'kitchen',
        title: 'Owner notes',
        subtitle: 'Private',
        summary: 'Hidden',
        search_terms: '[]',
        appliance_manual_terms: null,
        blocks: JSON.stringify([{ type: 'text', content: 'Secret' }]),
        published_blocks: JSON.stringify([{ type: 'text', content: 'Secret' }]),
        actions: '[]',
        sort_order: 1,
        published: 1,
        has_draft: 0,
        audience: 'owner'
      }
    ];

    const published = assembleGuideCatalog({}, settings, categories, topics, [], { publishedOnly: true });
    expect(published.categories[0]?.topics).toHaveLength(1);
    expect(published.categories[0]?.topics[0]?.id).toBe('dishwasher');

    const owner = assembleGuideCatalog({}, settings, categories, topics, [], { publishedOnly: false });
    expect(owner.categories[0]?.topics).toHaveLength(2);
  });

  it('returns draft blocks for owner edit mode', () => {
    const settings = {
      version: 2,
      home_summary_title: 'Welcome',
      home_summary_subtitle: 'Help'
    };
    const categories = [
      {
        id: 'kitchen',
        title: 'Kitchen',
        card_subtitle: 'Cook',
        icon_id: 'chef-hat',
        accent: '#fff',
        search_terms: '[]',
        sort_order: 0,
        published: 1
      }
    ];
    const topics = [
      {
        id: 'dishwasher',
        category_id: 'kitchen',
        title: 'Dishwasher',
        subtitle: 'Daily use',
        summary: 'Wash dishes',
        search_terms: '[]',
        appliance_manual_terms: null,
        blocks: JSON.stringify([{ type: 'text', content: 'Draft copy' }]),
        published_blocks: JSON.stringify([{ type: 'text', content: 'Published copy' }]),
        actions: '[]',
        sort_order: 0,
        published: 1,
        has_draft: 1
      }
    ];

    const catalog = assembleGuideCatalog({}, settings, categories, topics, [], {
      includeDraftBlocks: true
    });
    expect(catalog.categories[0]?.topics[0]?.blocks[0]?.content).toBe('Draft copy');
  });
});

describe('sanitizeGuideActions', () => {
  it('accepts alexa and navigate actions', () => {
    const actions = sanitizeGuideActions([
      { type: 'alexa', buttonId: 2, label: 'Bedtime' },
      { type: 'navigate', topicId: 'feeding', label: 'Feeding guide' }
    ]);
    expect(actions).toHaveLength(2);
  });

  it('rejects invalid actions', () => {
    expect(sanitizeGuideActions([{ type: 'alexa', buttonId: 0, label: '' }])).toBeNull();
  });
});

describe('guide editor blocks', () => {
  it('creates empty blocks with sensible defaults', () => {
    expect(createEmptyGuideBlock('text')).toEqual({ type: 'text', content: '' });
    expect(createEmptyGuideBlock('steps').steps).toEqual(['']);
    expect(createEmptyGuideBlock('place')).toMatchObject({
      type: 'place',
      name: '',
      address: '',
      dogFriendly: false
    });
    expect(createEmptyGuideBlock('contact').items?.[0]).toMatchObject({
      label: '',
      value: '',
      href: ''
    });
  });
});
