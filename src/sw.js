// sw.js (ESM-kompatibel, lokal gebundelt)
import { del, get, set } from 'idb-keyval';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Upload abfangen und lokal speichern
registerRoute(
  ({ request }) => request.method === 'POST' && request.url.includes('/audio'),
  async ({ request }) => {
    const body = await request.blob();
    const url = new URL(request.url);
    const key = url.pathname;

    await set(key, body);

    return new Response(JSON.stringify({ success: true, stored: key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
  'POST'
);

// GET zum Abrufen lokal gespeicherter Uploads
registerRoute(
  ({ request }) => request.method === 'GET' && request.url.includes('/audio'),
  async ({ request }) => {
    const url = new URL(request.url);
    const key = url.pathname;
    const data = await get(key);

    if (!data) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  },
  'GET'
);

// DELETE zum Löschen lokal gespeicherter Uploads
registerRoute(
  ({ request }) => request.method === 'DELETE' && request.url.includes('/audio'),
  async ({ request }) => {
    const url = new URL(request.url);
    const key = url.pathname;

    await del(key);

    return new Response(JSON.stringify({ success: true, deleted: key }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
  'DELETE'
);

// Workbox Standardrouting für alle anderen GET-Requests
registerRoute(
  ({ request }) => request.method === 'GET' && !request.url.includes('/audio'),
  new NetworkFirst()
);

// Precache-Ressourcen (wird bei injectManifest ersetzt)
precacheAndRoute(self.__WB_MANIFEST);