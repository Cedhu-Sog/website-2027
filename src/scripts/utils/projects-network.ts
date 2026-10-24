/** Bounded retries for the repository's idempotent GETs and operation-keyed
 * writes. Never retry validation/permission failures or send data elsewhere.
 */
export async function repositoryFetch(url: string, options: RequestInit = {}) {
  const timeout = AbortSignal.timeout(55000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', ...options, signal });
    if (response.status !== 503 || attempt >= 2) return response;
    const specified = Number(response.headers.get('retry-after'));
    const delay = Math.min(30, specified > 0 && Number.isFinite(specified) ? specified : 5 * (attempt + 1)) * 1000;
    await response.body?.cancel();
    await new Promise<void>((resolve, reject) => {
      const stop = () => { clearTimeout(timer); reject(new DOMException('Solicitud cancelada.', 'AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, delay);
      if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true });
    });
  }
}
