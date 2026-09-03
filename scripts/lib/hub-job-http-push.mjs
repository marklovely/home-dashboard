/**
 * Cloudflare Queues HTTP push payload.
 *
 * The REST API requires `body` to be an object (or a batch array). A JSON
 * string is rejected with 400 / code 10207:
 *   Expected object, received string at "body"
 *
 * Docs: https://developers.cloudflare.com/queues/examples/publish-to-a-queue-via-http/
 *
 * @param {{ siteId: string, action: string, ref?: string }} job
 */
export function hubJobHttpPushPayload(job) {
  return { body: job };
}
