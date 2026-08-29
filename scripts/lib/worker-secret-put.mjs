import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const workerDir = join(root, 'worker');

/**
 * @param {string | null} wranglerEnv Wrangler env name, or null for the default (production) Worker
 * @param {string} name Secret name
 * @param {string} value Secret value
 * @param {{ dryRun?: boolean }} [options]
 */
export function putWorkerSecret(wranglerEnv, name, value, options = {}) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    throw new Error(`Missing value for Worker secret ${name}.`);
  }

  const envLabel = wranglerEnv ? `--env ${wranglerEnv}` : 'default Worker';

  if (options.dryRun) {
    console.log(`Would set Worker secret ${name} (${envLabel})`);
    return;
  }

  const args = ['wrangler', 'secret', 'put', name];
  if (wranglerEnv) {
    args.push('--env', wranglerEnv);
  }

  console.log(`Setting Worker secret ${name} (${envLabel})`);
  execFileSync('npx', args, {
    cwd: workerDir,
    input: trimmed,
    stdio: ['pipe', 'inherit', 'inherit']
  });
}

/**
 * @param {string} deploySiteId From deploy-all-workers (prod = default Worker script)
 * @returns {string | null}
 */
export function wranglerEnvFromDeploySiteId(deploySiteId) {
  return deploySiteId === 'prod' ? null : deploySiteId;
}
