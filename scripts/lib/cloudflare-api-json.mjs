/**
 * Cloudflare sometimes returns an empty body (new Pages project, 204, or a
 * deployments list before the first upload). `response.json()` throws
 * "Unexpected end of JSON input" and fails the whole HUB_API repair job.
 *
 * @param {string} text
 * @param {{ ok: boolean, status: number, path: string, method: string }} response
 */
export function parseCloudflareApiJson(text, response) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    if (!response.ok) {
      const error = new Error(
        `${response.method} ${response.path} failed: empty ${response.status} body`
      );
      error.status = response.status;
      throw error;
    }
    return { success: true, result: [] };
  }
  return JSON.parse(trimmed);
}
