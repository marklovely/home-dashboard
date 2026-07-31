import { describe, expect, it } from 'vitest';
import { buildImportableGuideCatalog } from '../src/houseGuide/exportCatalog.js';

describe('buildImportableGuideCatalog', () => {
  it('exports draft blocks and bundled media for import', () => {
    const settings = {
      version: 2,
      home_summary_title: 'Welcome home',
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
        has_draft: 1,
        audience: 'guest'
      }
    ];
    const media = [
      {
        id: 'kitchen-photo',
        alt: 'Kitchen',
        source_file: 'kitchen.jpg',
        object_key: null,
        published: 1
      },
      {
        id: 'uploaded-photo',
        alt: 'Uploaded',
        source_file: null,
        object_key: 'guide-media/abc.jpg',
        published: 1
      }
    ];

    const result = buildImportableGuideCatalog(settings, categories, topics, media);
    expect(result.catalog.categories[0]?.topics[0]?.blocks[0]?.content).toBe('Draft copy');
    expect(result.catalog.media['kitchen-photo']).toEqual({ alt: 'Kitchen', file: 'kitchen.jpg' });
    expect(result.uploadedMedia).toEqual([{ id: 'uploaded-photo', alt: 'Uploaded' }]);
  });
});
