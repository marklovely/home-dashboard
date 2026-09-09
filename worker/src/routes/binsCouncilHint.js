import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { resolveCouncilHint } from '../bins/councilHint.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleBinsCouncilHint(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const postcode = new URL(request.url).searchParams.get('postcode')?.trim() ?? '';
  const result = await resolveCouncilHint(postcode, fetchImpl);
  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'private, no-store' }
  });
}
