/**
 * Browser helpers for Stripe hosted Checkout (Onelink / Payment Element accordion).
 * Card fields may sit behind a "Card" radio, a "Pay with card" button, or inside iframes.
 */

/**
 * @param {import('@playwright/test').Page} page
 */
export async function selectStripeCardPaymentMethod(page) {
  await page
    .getByRole('heading', { name: /payment method|try lovely home/i })
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => {});

  const cardRadio = page.getByRole('radio', { name: /^card$/i });
  if (await cardRadio.count()) {
    await cardRadio.first().check({ force: true }).catch(async () => {
      await cardRadio.first().click({ force: true });
    });
  }

  const cardRow = page.getByRole('listitem').filter({ has: page.getByRole('radio', { name: /^card$/i }) });
  if (await cardRow.count()) {
    await cardRow.first().click({ timeout: 10_000 }).catch(() => {});
  }

  const payWithCard = page.getByRole('button', { name: /pay with card/i });
  if (await payWithCard.count()) {
    await payWithCard.first().click({ timeout: 10_000 }).catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page | import('@playwright/test').Frame} root
 * @param {Array<string | RegExp>} patterns
 */
async function firstVisibleField(root, patterns) {
  for (const pattern of patterns) {
    const locator =
      pattern instanceof RegExp ? root.getByRole('textbox', { name: pattern }) : root.locator(pattern);
    if (!(await locator.count())) continue;
    const field = locator.first();
    if (await field.isVisible().catch(() => false)) return field;
  }
  return null;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {Array<string | RegExp>} patterns
 * @param {number} [timeoutMs]
 */
export async function locateVisibleStripeField(page, patterns, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const field = await firstVisibleField(page, patterns);
    if (field) return field;

    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const nested = await firstVisibleField(frame, patterns);
      if (nested) return nested;
    }

    await page.waitForTimeout(250);
  }
  return null;
}

/**
 * Stripe hosted Checkout often ignores a single `.fill()` — type so its listeners fire.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {string} value
 */
export async function typeStripeField(locator, value) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 25 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function clickStripeCheckoutSubmit(page) {
  const submit = page
    .getByTestId('hosted-payment-submit-button')
    .or(page.getByRole('button', { name: /subscribe|pay/i }));
  await submit.first().waitFor({ state: 'visible', timeout: 30_000 });
  await submit.first().scrollIntoViewIfNeeded();
  await submit.first().click({ timeout: 10_000 }).catch(async () => {
    await submit.first().click({ force: true });
  });
}

/**
 * Fill the test card when hosted Checkout exposes card fields. Returns false when the
 * accordion/iframes never surface inputs so callers can fall back to the Stripe API.
 *
 * @param {import('@playwright/test').Page} page
 */
/**
 * @param {import('@playwright/test').Page} page
 * @param {(root: import('@playwright/test').Page | import('@playwright/test').Frame) => Promise<void>} visit
 */
async function visitStripeFrames(page, visit) {
  await visit(page);
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    await visit(frame);
  }
}

export async function tryCompleteStripeHostedCheckout(page) {
  try {
    await selectStripeCardPaymentMethod(page);

    const cardNumber = await locateVisibleStripeField(page, [
      /card number/i,
      'input[autocomplete="cc-number"]',
      'input[name="number"]',
      'input[placeholder*="1234"]'
    ]);
    if (!cardNumber) return false;

    await typeStripeField(cardNumber, '4242424242424242');

    const expiry = await locateVisibleStripeField(page, [
      /expiration|expiry|mm \/ yy/i,
      'input[autocomplete="cc-exp"]',
      'input[name="exp-date"]',
      'input[placeholder*="MM"]'
    ]);
    if (expiry) await typeStripeField(expiry, '1234');

    const cvc = await locateVisibleStripeField(page, [
      /cvc|security code|cvv/i,
      'input[autocomplete="cc-csc"]',
      'input[name="cvc"]'
    ]);
    if (cvc) await typeStripeField(cvc, '123');

    let filledName = false;
    await visitStripeFrames(page, async (root) => {
      if (filledName) return;
      const name = root.getByRole('textbox', { name: /cardholder name|full name/i });
      if (await name.count()) {
        await name.first().fill('Lifecycle Test');
        filledName = true;
      }
    });

    let filledPostcode = false;
    await visitStripeFrames(page, async (root) => {
      if (filledPostcode) return;
      const postcode = root.getByRole('textbox', { name: /postal code|postcode|zip/i });
      if (await postcode.count()) {
        await postcode.first().fill('SW1A 1AA');
        filledPostcode = true;
      }
    });

    await clickStripeCheckoutSubmit(page);
    return true;
  } catch {
    return false;
  }
}
