import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const workerDir = join(root, 'worker');

/** @typedef {'secret' | 'versions'} WorkerSecretPutMode */

/**
 * @param {string | null} wranglerEnv
 * @param {string} name
 * @param {WorkerSecretPutMode} mode
 * @returns {string[]}
 */
export function wranglerSecretPutArgs(wranglerEnv, name, mode) {
  const command = mode === 'versions' ? 'versions secret put' : 'secret put';
  const args = ['wrangler', ...command.split(' '), name];
  if (wranglerEnv === null) {
    args.push('--env', '');
  } else {
    args.push('--env', wranglerEnv);
  }
  return args;
}

/**
 * @param {string} output
 */
export function needsVersionsSecretPut(output) {
  return (
    output.includes("isn't currently deployed") ||
    output.includes('wrangler versions secret put') ||
    output.includes('latest version of your Worker')
  );
}

/**
 * @param {string | null} wranglerEnv
 * @param {string} name
 * @param {string} value
 * @param {WorkerSecretPutMode} mode
 */
function runWranglerSecretPut(wranglerEnv, name, value, mode) {
  const args = wranglerSecretPutArgs(wranglerEnv, name, mode);
  execFileSync('npx', args, {
    cwd: workerDir,
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8'
  });
}

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

  const envLabel =
    wranglerEnv === null ? 'default Worker (--env="")' : `Worker (--env ${wranglerEnv})`;

  if (options.dryRun) {
    console.log(`Would set Worker secret ${name} on ${envLabel}`);
    return;
  }

  console.log(`Setting Worker secret ${name} on ${envLabel}`);

  try {
    runWranglerSecretPut(wranglerEnv, name, trimmed, 'secret');
    return;
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '') : '';
    const stdout = error instanceof Error && 'stdout' in error ? String(error.stdout ?? '') : '';
    const combined = `${stdout}\n${stderr}`;
    if (!needsVersionsSecretPut(combined)) {
      if (combined.trim()) {
        process.stderr.write(combined);
      }
      throw error;
    }
    console.warn(
      'Worker has no live deployment — using wrangler versions secret put (secret applies on next deploy).'
    );
  }

  runWranglerSecretPut(wranglerEnv, name, trimmed, 'versions');
}

/**
 * @param {string} deploySiteId From deploy-all-workers (prod = default Worker script)
 * @returns {string | null}
 */
export function wranglerEnvFromDeploySiteId(deploySiteId) {
  return deploySiteId === 'prod' ? null : deploySiteId;
}
