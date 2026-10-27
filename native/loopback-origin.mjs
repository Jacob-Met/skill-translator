// A matching Origin and Host alone is insufficient: a foreign Host can reach a
// loopback listener after DNS rebinding. Require a literal loopback Host too.
export function isLoopbackOrigin(req) {
  const host = req.headers.host;
  if (typeof host !== 'string' || typeof req.headers.origin !== 'string') return false;
  try {
    const address = new URL(`http://${host}`);
    return address.host === host
      && ['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname)
      && req.headers.origin === `http://${host}`;
  } catch {
    return false;
  }
}
