/**
 * @param {ResponseInit & { correlationId?: string }} [options]
 */
export function jsonError(status, code, message, options = {}) {
  const { correlationId, ...init } = options;
  const body = {
    error: {
      code,
      message
    }
  };
  if (correlationId) {
    body.error.correlationId = correlationId;
  }
  return Response.json(body, { status, ...init });
}

export function notFound(correlationId) {
  return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
}

export function methodNotAllowed(correlationId) {
  return jsonError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { correlationId });
}

export function notImplemented(correlationId, message = 'Not implemented.') {
  return jsonError(501, 'NOT_IMPLEMENTED', message, { correlationId });
}
