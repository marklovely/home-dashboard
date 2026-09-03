import { describe, expect, it } from 'vitest';
import {
  HUB_NAME_HOLD_MS,
  applyHubNameHoldAfterCancel,
  hubNameHeldReason,
  hubNameHeldUntil,
  isHubNameHeld
} from '../functions/api/platform/platformHubNameHold.js';

describe('platformHubNameHold', () => {
  it('holds a hub name for twelve months after cancel', () => {
    const now = Date.UTC(2026, 0, 15, 12);
    expect(hubNameHeldUntil(now)).toBe(now + HUB_NAME_HOLD_MS);
    expect(HUB_NAME_HOLD_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('detects an active hold', () => {
    const now = 1_700_000_000_000;
    expect(isHubNameHeld({ slug_held_until: now + 1000 }, now)).toBe(true);
    expect(isHubNameHeld({ slug_held_until: now - 1000 }, now)).toBe(false);
    expect(isHubNameHeld(null, now)).toBe(false);
  });

  it('uses customer-facing hub name copy', () => {
    const reason = hubNameHeldReason('rose-cottage', Date.UTC(2027, 5, 1));
    expect(reason).toContain('hub name');
    expect(reason).toContain('rose-cottage.lovely-hub.com');
    expect(reason).not.toMatch(/\bslug\b/i);
  });

  it('does not shorten an existing hold on repeat cancel', async () => {
    /** @type {{ slug_held_until?: number | null, updated_at?: number }} */
    let row = { slug_held_until: null, updated_at: 0 };
    const db = /** @type {D1Database} */ ({
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async run() {
                if (sql.includes('slug_held_until')) {
                  const heldUntil = /** @type {number} */ (args[0]);
                  const nextHeld = /** @type {number} */ (args[1]);
                  const now = /** @type {number} */ (args[2]);
                  row.slug_held_until =
                    row.slug_held_until == null || row.slug_held_until < heldUntil
                      ? nextHeld
                      : row.slug_held_until;
                  row.updated_at = now;
                }
              }
            };
          }
        };
      }
    });

    const firstNow = 1_000;
    const longHold = hubNameHeldUntil(firstNow) + 5_000;
    row.slug_held_until = longHold;

    await applyHubNameHoldAfterCancel(db, 'rose-cottage', firstNow + 1_000);
    expect(row.slug_held_until).toBe(longHold);
  });
});
