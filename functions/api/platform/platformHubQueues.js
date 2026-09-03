/**
 * Cloudflare Queue producers for paid hub signup / cancel.
 *
 * Bindings come from Terraform (`queue_producers` on the platform Pages project).
 * The hub-jobs Worker consumes the queues and dispatches GitHub Actions.
 */

export const HUB_PROVISION_QUEUE_BINDING = 'HUB_PROVISION_QUEUE';
export const HUB_REGISTRY_QUEUE_BINDING = 'HUB_REGISTRY_QUEUE';

/**
 * @param {unknown} queue
 * @returns {queue is { send: (body: unknown) => Promise<unknown> }}
 */
function isQueueProducer(queue) {
  return Boolean(queue && typeof queue === 'object' && typeof queue.send === 'function');
}

/**
 * @param {Record<string, unknown>} env
 */
export function hubProvisionQueueConfigured(env) {
  return isQueueProducer(env[HUB_PROVISION_QUEUE_BINDING]);
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ siteId: string, action: 'provision' | 'teardown', ref?: string }} job
 */
export async function enqueueHubProvisionJob(env, job) {
  const queue = env[HUB_PROVISION_QUEUE_BINDING];
  if (!isQueueProducer(queue)) {
    return {
      ok: false,
      error: 'QUEUE_NOT_CONFIGURED',
      message:
        'HUB_PROVISION_QUEUE is not bound on platform Pages. Apply the platform Terraform stack to create the hub job queues.'
    };
  }
  await queue.send({
    siteId: job.siteId,
    action: job.action,
    ...(job.ref ? { ref: job.ref } : {})
  });
  return { ok: true, queue: HUB_PROVISION_QUEUE_BINDING, action: job.action, siteId: job.siteId };
}

/**
 * @param {Record<string, unknown>} env
 * @param {{ siteId: string, action: 'record' | 'drop', ref: string }} job
 */
export async function enqueueHubRegistryJob(env, job) {
  const queue = env[HUB_REGISTRY_QUEUE_BINDING];
  if (!isQueueProducer(queue)) {
    return {
      ok: false,
      error: 'QUEUE_NOT_CONFIGURED',
      message:
        'HUB_REGISTRY_QUEUE is not bound on platform Pages. Apply the platform Terraform stack to create the hub job queues.'
    };
  }
  await queue.send({
    siteId: job.siteId,
    action: job.action,
    ref: job.ref
  });
  return { ok: true, queue: HUB_REGISTRY_QUEUE_BINDING, action: job.action, siteId: job.siteId };
}
