import { describe, expect, it, vi } from 'vitest';
import {
  extractJsonArrayFromModelText,
  parseBinDatesWithAi
} from '../src/bins/parseDatesAi.js';

describe('extractJsonArrayFromModelText', () => {
  it('parses a JSON array embedded in model output', () => {
    const array = extractJsonArrayFromModelText(
      'Here you go:\n[{"date":"2026-05-01","type":"rubbish"}]\nDone.'
    );
    expect(array).toEqual([{ date: '2026-05-01', type: 'rubbish' }]);
  });

  it('returns null when no array is present', () => {
    expect(extractJsonArrayFromModelText('no dates here')).toBeNull();
  });
});

describe('parseBinDatesWithAi', () => {
  it('returns AI_NOT_AVAILABLE when Workers AI is not bound', async () => {
    const result = await parseBinDatesWithAi({}, 'Rubbish 1 May 2026');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('AI_NOT_AVAILABLE');
  });

  it('normalizes valid model output into entries', async () => {
    const env = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: '[{"date":"2026-05-01","type":"rubbish"},{"date":"2026-05-08","type":"recycling"}]'
        })
      }
    };

    const result = await parseBinDatesWithAi(env, 'Council calendar text');
    expect(result.ok).toBe(true);
    expect(result.entries).toEqual([
      { date: '2026-05-01', type: 'rubbish' },
      { date: '2026-05-08', type: 'recycling' }
    ]);
  });
});
