/**
 * @param {Record<string, unknown>} health
 * @param {Record<string, unknown>} probe
 */
export function evaluateSiteHealth(health, probe) {
  if (health.needsServiceAuth || probe.needsServiceAuth) {
    return { status: 'unknown', score: 0, checks: [] };
  }

  const workerOk = health.ok === true && health.body?.status === 'ok';
  const bindingOk = probe.body?.usesHubApiBinding === true;
  const accessOk =
    probe.body?.canForwardJwt === true || probe.body?.middlewareAccessValidated === true;

  const checks = [
    { id: 'worker', ok: workerOk, label: `Worker /api/health ${workerOk ? 'OK' : 'fail'}` },
    { id: 'hub-api', ok: bindingOk, label: `HUB_API binding ${bindingOk ? 'yes' : 'no'}` },
    {
      id: 'access-probe',
      ok: accessOk,
      label: `Access probe ${accessOk ? 'OK' : 'check Pages env'}`
    }
  ];

  const score = checks.filter((c) => c.ok).length;
  let status = 'bad';
  if (score === checks.length) status = 'healthy';
  else if (score > 0) status = 'degraded';

  return { status, score, checks, workerOk, bindingOk, accessOk };
}

/**
 * @param {{ status: string, checks: { id: string, ok: boolean, label: string }[] }} result
 */
export function renderHealthSummary(result) {
  if (!result.checks.length) {
    return `<ul class="health-list"><li class="warn">Health checks unavailable — configure platform service token.</li></ul>`;
  }

  return `
    <ul class="health-list">
      ${result.checks
        .map((check) => {
          const cls = check.ok ? 'ok' : check.id === 'access-probe' ? 'warn' : 'bad';
          return `<li class="${cls}">${check.label}</li>`;
        })
        .join('')}
    </ul>
  `;
}

/**
 * @param {Record<string, unknown>[]} steps
 * @param {{ workerOk?: boolean, bindingOk?: boolean, accessOk?: boolean }} health
 */
export function mergeProvisioningWithHealth(steps, health) {
  return steps.map((step) => {
    const id = String(step.id ?? '');
    if (id === 'worker' && health.workerOk != null) return { ...step, done: health.workerOk };
    if (id === 'hub-api' && health.bindingOk != null) return { ...step, done: health.bindingOk };
    if (id === 'access-probe' && health.accessOk != null) return { ...step, done: health.accessOk };
    if (id === 'pages' && health.workerOk != null) return { ...step, done: health.workerOk };
    return step;
  });
}

/**
 * @param {string} status
 */
export function statusLabel(status) {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'bad':
      return 'Unhealthy';
    default:
      return 'Unchecked';
  }
}
