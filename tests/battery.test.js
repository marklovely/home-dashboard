import { describe, expect, it } from 'vitest';
import { formatBattery } from '../src/js/modules/battery.js';

describe('battery', () => {
  it('formats percentage and state', () => {
    expect(formatBattery(0.976, true)).toEqual({ level: '98%', state: 'Charging' });
  });
});
