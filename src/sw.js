// Service worker: makes the app work offline. It is bundled during the web build (see package.json build:web).
// The app has no server part: all data (audio files and clips) is stored in the browser.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

// Precached files must be registered first, routes are matched in registration order
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Single page app: every navigation (also deep links like /info) is answered with the app shell, also offline
registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
        // Real files (e.g. licenses.md) are not part of the app shell
        denylist: [/\/[^/?]+\.[a-z0-9]+(\?.*)?$/i],
    }),
)

// Everything else from this origin that is not precached (e.g. rarely used icon fonts)
registerRoute(
    ({ url, request }) => url.origin === self.location.origin && request.method === 'GET',
    new NetworkFirst({ cacheName: 'runtime', networkTimeoutSeconds: 3 }),
)

// Activates a new version when the app is started (see the registration in public/index.html), but only
// if no other tab is open: activating removes the old precached files, which another tab still running
// the old version may need (e.g. lazily loaded chunks). Otherwise the update is applied on a later start.
self.addEventListener('message', (event) => {
    if (event.data !== 'SKIP_WAITING') return
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((windows) => {
            if (windows.length <= 1) return self.skipWaiting()
            return undefined
        }),
    )
})
