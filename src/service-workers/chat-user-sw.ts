const sw = self as unknown as ServiceWorkerGlobalScope;

// Listen for the 'install' event
sw.addEventListener('install', _event => {
  sw.skipWaiting();
});
  
// Listen for the 'activate' event
sw.addEventListener('activate', event => {
  // Cast event to ExtendableEvent to use waitUntil
  const activateEvent = event as ExtendableEvent;
  activateEvent.waitUntil(sw.clients.claim());

  // Start fetching messages once the service worker is activated
  START_FETCHING_MESSAGES();
});