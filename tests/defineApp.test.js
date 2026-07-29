import { describe, expect, it } from 'vitest';
import { defineApp } from '../src/components/App/defineApp.js';

describe('defineApp', () => {
  it('requires metadata and capabilities', () => {
    const app = defineApp({
      id: 'demo',
      title: 'Demo',
      iconId: 'settings',
      description: 'Demo app',
      capabilities: ['demo'],
      profiles: ['owner'],
      mount() {}
    });
    expect(app.capabilities).toEqual(['demo']);
  });

  it('rejects apps without capabilities', () => {
    expect(() =>
      defineApp({
        id: 'bad',
        title: 'Bad',
        iconId: 'settings',
        description: 'x',
        capabilities: [],
        profiles: ['owner'],
        mount() {}
      })
    ).toThrow(/capabilities/i);
  });
});
