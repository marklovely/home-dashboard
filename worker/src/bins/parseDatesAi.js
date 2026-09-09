const MAX_INPUT_CHARS = 8000;
const MODEL = '@cf/meta/llama-3.1-8b-instruct';

/**
 * @param {string} text
 */
export function extractJsonArrayFromModelText(text) {
  const raw = String(text ?? '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} env
 * @param {string} text
 */
export async function parseBinDatesWithAi(env, text) {
  if (!env?.AI) {
    return { ok: false, code: 'AI_NOT_AVAILABLE', error: 'AI cleanup is not enabled on this hub.' };
  }

  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: 'Text is required.' };
  }

  const input = trimmed.slice(0, MAX_INPUT_CHARS);
  const prompt = [
    'Extract UK bin collection dates from the text below.',
    'Return ONLY a JSON array. Each item must have:',
    '- "date": ISO date YYYY-MM-DD',
    '- "type": one of rubbish, recycling, gardenWaste',
    'Skip entries without a clear date. No markdown, no explanation.',
    '',
    input
  ].join('\n');

  try {
    const response = await env.AI.run(MODEL, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.1
    });

    const content =
      typeof response === 'string'
        ? response
        : String(response?.response ?? response?.result?.response ?? '').trim();

    const array = extractJsonArrayFromModelText(content);
    if (!array?.length) {
      return { ok: false, status: 422, error: 'AI could not extract any dates — try editing the text manually.' };
    }

    /** @type {Array<{ date: string, type: string }>} */
    const entries = [];
    for (const item of array) {
      if (!item || typeof item !== 'object') continue;
      const record = /** @type {Record<string, unknown>} */ (item);
      const date = String(record.date ?? '').trim();
      const type = String(record.type ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!['rubbish', 'recycling', 'gardenWaste'].includes(type)) continue;
      entries.push({ date, type });
    }

    if (!entries.length) {
      return { ok: false, status: 422, error: 'AI could not extract valid dates — try editing the text manually.' };
    }

    return { ok: true, entries };
  } catch {
    return { ok: false, status: 503, error: 'AI cleanup is temporarily unavailable.' };
  }
}
