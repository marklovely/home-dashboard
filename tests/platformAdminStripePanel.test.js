import { beforeEach, describe, expect, it } from 'vitest';
import { renderStripeModePanel } from '../platform-admin/src/stripeMode.js';
import { panelFoldOpenAttr, resetPanelFoldState, wirePanelFold } from '../platform-admin/src/panelFold.js';

describe('platform admin Stripe panel', () => {
  beforeEach(() => {
    resetPanelFoldState();
    document.body.innerHTML = '';
  });

  it('wraps Stripe in a closed details twisty with the mode badge', () => {
    const html = renderStripeModePanel(
      { mode: 'test', stripeBillingConfigured: true, testConfigured: true },
      true
    );
    expect(html).toContain('id="stripe-mode-fold"');
    expect(html).toContain('panel-fold-summary');
    expect(html).toContain('Test mode');
    expect(html).not.toMatch(/id="stripe-mode-fold" open/);
  });

  it('remembers an opened twisty across re-renders', () => {
    document.body.innerHTML = renderStripeModePanel(
      { mode: 'test', stripeBillingConfigured: true },
      true
    );
    wirePanelFold('stripe-mode-fold');
    const fold = document.getElementById('stripe-mode-fold');
    expect(fold).toBeInstanceOf(HTMLDetailsElement);
    fold.open = true;
    fold.dispatchEvent(new Event('toggle'));
    expect(panelFoldOpenAttr('stripe-mode-fold')).toBe(' open');
    expect(renderStripeModePanel({ mode: 'live', stripeBillingConfigured: true }, true)).toContain(
      'id="stripe-mode-fold" open'
    );
  });
});
