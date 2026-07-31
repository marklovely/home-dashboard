import { describe, expect, it } from 'vitest';
import {
  findManualsForGuideTopic,
  getGuideTopicManualMatchTerms
} from '../src/services/applianceManualsGuideLinks.js';
import { getGuideTopic } from '../src/services/guideService.js';

/** @type {import('../src/api/applianceManualsApi.js').ApplianceManual} */
function sampleManual(overrides = {}) {
  return {
    id: 'manual-1',
    title: 'User guide',
    applianceName: 'Dishwasher',
    manufacturer: 'Bosch',
    model: 'SMS2',
    category: 'Kitchen',
    location: 'Kitchen',
    description: 'Daily use',
    originalFilename: 'dishwasher.pdf',
    mimeType: 'application/pdf',
    fileSize: 1200,
    published: true,
    sortOrder: 0,
    createdAt: '2026-07-29T10:00:00.000Z',
    updatedAt: '2026-07-29T10:00:00.000Z',
    ...overrides
  };
}

describe('appliance manual guide links', () => {
  it('uses explicit applianceManualTerms when provided', () => {
    const topic = getGuideTopic('turning-on-tv');
    expect(topic).toBeTruthy();
    expect(getGuideTopicManualMatchTerms(topic)).toEqual(['tv', 'television', 'lg']);
  });

  it('matches dishwasher topic to dishwasher manual', () => {
    const topic = getGuideTopic('dishwasher');
    expect(topic).toBeTruthy();
    const matches = findManualsForGuideTopic(topic, [
      sampleManual(),
      sampleManual({ id: 'manual-2', applianceName: 'Nest Thermostat', title: 'Nest guide' })
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.applianceName).toBe('Dishwasher');
  });

  it('matches washing machine topic without matching unrelated manuals', () => {
    const topic = getGuideTopic('washing-tumble-dryer');
    expect(topic).toBeTruthy();
    const matches = findManualsForGuideTopic(topic, [
      sampleManual({ id: 'washer', applianceName: 'Washing Machine', title: 'Laundry guide' }),
      sampleManual({ id: 'dryer', applianceName: 'Tumble Dryer', title: 'Dryer guide' }),
      sampleManual({ id: 'dish', applianceName: 'Dishwasher', title: 'Kitchen guide' })
    ]);
    expect(matches.map((manual) => manual.applianceName).sort()).toEqual(['Tumble Dryer', 'Washing Machine']);
  });

  it('does not match tea basics to appliance manuals', () => {
    const topic = getGuideTopic('tea-coffee-basics');
    expect(topic).toBeTruthy();
    const matches = findManualsForGuideTopic(topic, [
      sampleManual({ applianceName: 'Coffee Machine', title: 'Barista guide' })
    ]);
    expect(matches).toHaveLength(0);
  });
});
