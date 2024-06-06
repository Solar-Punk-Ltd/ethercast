interface ServiceWorkerGlobalScope extends EventTarget {
  skipWaiting(): Promise<void>;
  clients: Clients;
}

interface Clients {
  claim(): Promise<void>;
  matchAll(): Promise<Client[]>;
  // Add other client methods if needed
}

interface Client {
  postMessage(message: any): void;
  // Add other client methods if needed
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}