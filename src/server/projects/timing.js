// Request-local numeric telemetry only: no URLs, identities, rows or credentials.
export function requestTiming() {
  const started = performance.now(); const entries = new Map();
  async function measure(name, operation) {
    const at = performance.now();
    try { return await operation(); }
    finally {
      const entry = entries.get(name) || { ms: 0, count: 0 };
      entry.ms += performance.now() - at; entry.count++; entries.set(name, entry);
    }
  }
  function response(result) {
    const summary = [...entries].map(([name, e]) => `${name};dur=${e.ms.toFixed(1)};desc="${e.count} operations"`);
    summary.push(`server;dur=${(performance.now() - started).toFixed(1)}`);
    result.headers.set('Server-Timing', summary.join(', '));
    // Also usable when a hosting proxy strips the standard Server-Timing header.
    result.headers.set('X-CEDHU-Timing', summary.join(', '));
    return result;
  }
  return { measure, response };
}

export function measuredHandler(operation) {
  return async request => {
    const timing = requestTiming();
    return timing.response(await operation(request, timing));
  };
}

export function measuredGoogleClient(client, timing) {
  if (!timing) return client;
  return {
    getAccessToken: () => timing.measure('google_auth', () => client.getAccessToken()),
    request: options => timing.measure(options.url.startsWith('https://sheets.googleapis.com/') ? 'sheets' : 'drive', () => client.request(options)),
  };
}
