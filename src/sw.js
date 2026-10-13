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

// Everything else from this origin that is not precached (e.g. rarely used icon fonts, the license texts)
const RUNTIME_CACHE = 'runtime'
registerRoute(
    ({ url, request }) => url.origin === self.location.origin && request.method === 'GET',
    new NetworkFirst({ cacheName: RUNTIME_CACHE, networkTimeoutSeconds: 3 }),
)

// The runtime cache holds files with hashed names (e.g. the license texts, several MB) that a new version
// does not use anymore: it starts empty with every version, so old files do not fill the storage that the
// audio files need. Also removes the runtime cache of the first version of the app (workbox default name).
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter((name) => name === RUNTIME_CACHE || name.startsWith('workbox-runtime-'))
                        .map((name) => caches.delete(name)),
                ),
            ),
    )
})

// Activates a new version when the app is started (see the registration in public/index.html), but only
// if no other tab is open: activating removes the old precached files, which another tab still running
// the old version may need (e.g. lazily loaded chunks). Otherwise the update is applied on a later start.
self.addEventListener('message', (event) => {
    if (event.data !== 'SKIP_WAITING') return
    event.waitUntil(
        // includeUncontrolled: from the waiting worker's view no window is controlled by it, so without it the
        // result is always empty. It also lists pages of the origin outside the app (e.g. other GitHub Pages
        // sites of the same user), which are not counted.
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const appWindows = windows.filter((client) => client.url.startsWith(self.registration.scope))
            if (appWindows.length <= 1) return self.skipWaiting()
            return undefined
        }),
    )
})
