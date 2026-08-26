import { describe, expect, it } from 'vitest';
import { DEMO_LOGIN_PATH } from '../functions/lib/demoPagesGate.js';

describe('demoPagesGate', () => {
  it('uses a pretty login path without .html', () => {
    expect(DEMO_LOGIN_PATH).toBe('/demo-login');
  });
});
