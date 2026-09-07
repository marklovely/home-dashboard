/**
 * Rate-limited sequential Cloudflare DELETE helpers.
 */

/**
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {unknown} error
 */
export function isRetryableCloudflareError(error) {
  const status = /** @type {{ status?: number }} */ (error)?.status;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * @param {unknown} error
 */
export function isCloudflareNotFoundError(error) {
  const status = /** @type {{ status?: number }} */ (error)?.status;
  const message = error instanceof Error ? error.message : String(error);
  return status === 404 || /not found|does not exist/i.test(message);
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<void>} deleteOne
 * @param {{
 *   delayMs?: number,
 *   maxAttempts?: number,
 *   progressEvery?: number,
 *   continueOnError?: boolean,
 *   shouldSkip?: (error: unknown) => boolean,
 *   onProgress?: (message: string) => void
 * }} [options]
 */
export async function deleteSequentially(items, deleteOne, options = {}) {
  const delayMs = options.delayMs ?? 500;
  const maxAttempts = options.maxAttempts ?? 12;
  const progressEvery = options.progressEvery ?? 25;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    let attempts = 0;
    let finished = false;

    while (attempts < maxAttempts && !finished) {
      try {
        await deleteOne(item);
        deleted += 1;
        finished = true;
      } catch (error) {
        if (options.shouldSkip?.(error)) {
          skipped += 1;
          finished = true;
          continue;
        }
        if (isRetryableCloudflareError(error)) {
          attempts += 1;
          const waitMs = Math.min(60_000, delayMs * 2 ** attempts);
          options.onProgress?.(
            `Rate limited — waiting ${Math.round(waitMs / 1000)}s (${index + 1}/${items.length})`
          );
          await sleep(waitMs);
          continue;
        }
        if (options.continueOnError) {
          failed += 1;
          options.onProgress?.(
            `Delete failed (${index + 1}/${items.length}): ${error instanceof Error ? error.message : String(error)}`
          );
          finished = true;
          continue;
        }
        throw error;
      }
    }

    if (!finished) {
      failed += 1;
      options.onProgress?.(`Gave up after ${maxAttempts} attempts (${index + 1}/${items.length})`);
    }

    if ((index + 1) % progressEvery === 0 || index + 1 === items.length) {
      options.onProgress?.(
        `Progress: ${deleted} deleted, ${skipped} skipped, ${failed} failed (${index + 1}/${items.length})`
      );
    }

    if (index + 1 < items.length) {
      await sleep(delayMs);
    }
  }

  return { deleted, skipped, failed };
}
