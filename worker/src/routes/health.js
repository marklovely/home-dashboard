export function handleHealth() {
  return Response.json({
    status: 'ok',
    service: 'lovely-home-hub-api',
    apiVersion: 2
  });
}
