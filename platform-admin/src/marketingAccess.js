/**
 * @param {Record<string, unknown>} data
 */
export function renderMarketingAccessPanel(data) {
  const origin = String(data.origin ?? 'https://lovely-home.co.uk');
  if (data.ok === false) {
    return `
      <section class="panel marketing-access" id="marketing-access">
        <h2>Marketing site access</h2>
        <p class="muted">${escapeHtml(String(data.message ?? 'Could not load the marketing OTP list.'))}</p>
      </section>
    `;
  }

  if (data.protected === false) {
    return `
      <section class="panel marketing-access" id="marketing-access">
        <h2>Marketing site access</h2>
        <p class="muted">${escapeHtml(String(data.message ?? 'The marketing site is not OTP-gated.'))}</p>
        <p class="muted">Gate it with <code>marketing_site_access_protected = true</code> in hub.tfvars, then terraform apply.</p>
      </section>
    `;
  }

  const operators = Array.isArray(data.operators) ? data.operators : [];
  const guests = Array.isArray(data.guests) ? data.guests : [];
  return `
    <section class="panel marketing-access" id="marketing-access">
      <h2>Marketing site access</h2>
      <p class="muted">OTP allow-list for <a href="${escapeHtml(origin)}" target="_blank" rel="noreferrer">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a> while the pre-launch gate is on. Extra emails can view the marketing site only — not this dashboard.</p>
      <ul class="marketing-access-list">
        ${operators.map((email) => `<li><span>${escapeHtml(String(email))}</span> <span class="badge">operator</span></li>`).join('')}
        ${guests
          .map(
            (email) =>
              `<li><span>${escapeHtml(String(email))}</span> <span class="badge badge-ok">guest</span> <button type="button" class="btn btn-small btn-ghost" data-marketing-remove="${escapeHtml(String(email))}">Remove</button></li>`
          )
          .join('')}
        ${operators.length + guests.length === 0 ? '<li class="muted">No emails on the Access policy yet.</li>' : ''}
      </ul>
      <p class="marketing-access-message" id="marketing-access-message" hidden></p>
      <form class="marketing-access-form" id="marketing-access-form">
        <label class="field">
          <span>Add email</span>
          <input type="email" name="email" autocomplete="off" required placeholder="name@example.com">
        </label>
        <button type="submit" class="btn">Add to marketing site</button>
      </form>
    </section>
  `;
}

/**
 * @param {(error: unknown) => void} onError
 * @param {() => Promise<void>} reload
 */
export function wireMarketingAccessPanel(onError, reload) {
  const messageEl = document.getElementById('marketing-access-message');

  /**
   * @param {unknown} error
   */
  function showMessage(error) {
    if (!messageEl) {
      onError(error);
      return;
    }
    messageEl.hidden = false;
    messageEl.textContent = error instanceof Error ? error.message : String(error);
  }

  const form = document.getElementById('marketing-access-form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = form.querySelector('input[name="email"]');
    const email = input instanceof HTMLInputElement ? input.value.trim() : '';
    if (!email) return;
    const button = form.querySelector('button[type="submit"]');
    button?.setAttribute('disabled', 'true');
    try {
      await mutateMarketingAccess('POST', email);
      await reload();
    } catch (error) {
      showMessage(error);
    } finally {
      button?.removeAttribute('disabled');
    }
  });

  document.querySelectorAll('[data-marketing-remove]').forEach((button) => {
    button.addEventListener('click', async () => {
      const email = button.getAttribute('data-marketing-remove');
      if (!email) return;
      button.setAttribute('disabled', 'true');
      try {
        await mutateMarketingAccess('DELETE', email);
        await reload();
      } catch (error) {
        showMessage(error);
        button.removeAttribute('disabled');
      }
    });
  });
}

/**
 * @param {'POST' | 'DELETE'} method
 * @param {string} email
 */
async function mutateMarketingAccess(method, email) {
  const response = await fetch('/api/platform/marketing-access', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    throw new Error(body.message ?? `Marketing access update failed (${response.status})`);
  }
  return body;
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
