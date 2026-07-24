if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
  self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;
    event.respondWith(fetch(event.request).then((response) => {
      if (response.status === 0) return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }));
  });
} else if ('serviceWorker' in navigator) {
  const reloadKey = 'kri-coi-reload';
  const reloadParam = 'kri-coi';
  if (window.crossOriginIsolated) {
    sessionStorage.removeItem(reloadKey);
    const cleanUrl = new URL(location.href);
    if (cleanUrl.searchParams.has(reloadParam)) {
      cleanUrl.searchParams.delete(reloadParam);
      history.replaceState(null, '', cleanUrl);
    }
  } else {
    let reloading = false;
    const reloadWithWorker = (attempt) => {
      if (reloading) return;
      reloading = true;
      const reloadUrl = new URL(location.href);
      reloadUrl.searchParams.set(reloadParam, String(attempt));
      location.replace(reloadUrl);
    };
    const retryWithWorker = () => {
      const attempts = Number.parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      if (attempts >= 3) {
        const loading = document.getElementById('loading');
        if (loading) {
          loading.textContent = 'kri needs one click to finish loading';
          loading.style.cursor = 'pointer';
          loading.onclick = () => {
            sessionStorage.removeItem(reloadKey);
            reloadWithWorker(1);
          };
        }
        return;
      }
      const nextAttempt = attempts + 1;
      sessionStorage.setItem(reloadKey, String(nextAttempt));
      reloadWithWorker(nextAttempt);
    };
    navigator.serviceWorker.addEventListener('controllerchange', retryWithWorker, { once: true });
    if (navigator.serviceWorker.controller) retryWithWorker();
    setTimeout(() => {
      if (!window.crossOriginIsolated) retryWithWorker();
    }, 500);
    navigator.serviceWorker.register('./coi-serviceworker.js')
      .then((registration) => {
        // A hard refresh may bypass an already-active worker for this
        // navigation. There is then no controllerchange event to await.
        if (registration.active || navigator.serviceWorker.controller) {
          retryWithWorker();
        } else {
          navigator.serviceWorker.ready.then(retryWithWorker);
        }
      })
      .catch((error) => console.error('could not start kri service worker:', error));
  }
}
