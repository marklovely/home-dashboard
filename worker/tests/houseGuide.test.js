import { describe, expect, it } from 'vitest';
import { assembleGuideCatalog, toPublicGuideCategory } from '../src/houseGuide/assembleCatalog.js';
import {
  countGuideCategories,
  createGuideCategory,
  GUIDE_CATEGORY_ACCENT_PALETTE
} from '../src/houseGuide/repository.js';
import { sanitizeGuideActions } from '../src/houseGuide/sanitize.js';
import { createEmptyGuideBlock } from '../../src/apps/HouseGuideEditor/guideEditorBlockDefaults.js';

/**
 * @returns {D1Database}
 */
function createGuideCategoryTestDb() {
  /** @type {Record<string, Record<string, unknown>>} */
  const categories = {};

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      const statement = {
        bind(...args) {
          return {
            async first() {
              if (normalized.startsWith('SELECT * FROM guide_categories WHERE id = ?')) {
                const id = String(args[0]);
                return categories[id] ?? null;
              }
              if (normalized.startsWith('SELECT COUNT(*) AS count FROM guide_categories')) {
                const count = Object.values(categories).filter(
                  (row) => row.id !== 'appliance-manuals'
                ).length;
                return { count };
              }
              if (normalized.startsWith('SELECT MAX(sort_order) AS max_order FROM guide_categories')) {
                const orders = Object.values(categories).map((row) => Number(row.sort_order ?? 0));
                return { max_order: orders.length ? Math.max(...orders) : null };
              }
              return null;
            },
            async run() {
              if (normalized.startsWith('INSERT INTO guide_categories')) {
                categories[String(args[0])] = {
                  id: args[0],
                  title: args[1],
                  card_subtitle: args[2],
                  icon_id: args[3],
                  accent: args[4],
                  search_terms: args[5],
                  sort_order: args[6],
                  published: args[7],
                  updated_at: args[8],
                  guide_id: args[9]
                };
              }
            }
          };
        }
      };

      return statement;
    }
  });
}

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

describe('guide categories', () => {
  it('creates a category with palette accent and counts editable areas', async () => {
    const db = createGuideCategoryTestDb();
    expect(await countGuideCategories(db)).toBe(0);

    const created = await createGuideCategory(db, {
      id: 'kitchen',
      title: 'Kitchen',
      cardSubtitle: 'Appliances'
    });
    expect(created?.id).toBe('kitchen');
    expect(toPublicGuideCategory(created, []).accent).toBe(GUIDE_CATEGORY_ACCENT_PALETTE[0]);
    expect(await countGuideCategories(db)).toBe(1);

    const conflict = await createGuideCategory(db, {
      id: 'kitchen',
      title: 'Kitchen again'
    });
    expect(conflict).toEqual({ conflict: true });
  });

  it('excludes appliance-manuals from the editable area count', async () => {
    const db = createGuideCategoryTestDb();
    await createGuideCategory(db, { id: 'appliance-manuals', title: 'Manuals' });
    await createGuideCategory(db, { id: 'kitchen', title: 'Kitchen' });
    expect(await countGuideCategories(db)).toBe(1);
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
