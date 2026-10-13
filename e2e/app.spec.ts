import { expect, Page, Route, test } from '@playwright/test'
import path from 'node:path'

const fixture = (name: string) => path.join(__dirname, 'fixtures', name)

type AudioState = { hasSource: boolean; time: number; paused: boolean; duration: number }

/** State of the audio element used by react-native-track-player on the web. */
const audio = (page: Page): Promise<AudioState> =>
    page.evaluate(() => {
        const element = (window as unknown as { rntp: { getMediaElement(): HTMLMediaElement } }).rntp.getMediaElement()
        return {
            hasSource: !!element.currentSrc && element.readyState > 0,
            time: element.currentTime,
            paused: element.paused,
            duration: element.duration,
        }
    })

const waitForAudio = (page: Page, predicate: string) =>
    page.waitForFunction(
        `(() => { const a = window.rntp.getMediaElement(); return ${predicate} })()`,
        undefined,
        { timeout: 15_000 },
    )

const importFile = async (page: Page, name: string) => {
    const chooser = page.waitForEvent('filechooser')
    await page.getByTestId('open-file').click()
    await (await chooser).setFiles(fixture(name))
}

const openTab = (page: Page, name: 'Songs' | 'Clips') => page.getByRole('tab', { name }).click()

const openMenuItem = async (page: Page, name: string) => {
    await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
    // The drawer item (the header of the open screen may have the same text)
    await page.getByRole('button', { name: new RegExp(`${name}$`) }).click()
}

/**
 * Whether the database of the app (LokiJS, saved every 500 ms) was written to IndexedDB. A tab started before
 * finds an empty database and sets it up again, which deletes it and so reloads the other tabs of the app.
 */
const databaseSaved = (page: Page) =>
    page.evaluate(async () => {
        // Only opened if it exists: opening creates it otherwise (without the object store of LokiJS)
        if (!(await indexedDB.databases()).some((database) => database.name === 'loki.db')) return false
        return new Promise<boolean>((resolve) => {
            const request = indexedDB.open('loki.db')
            request.onerror = () => resolve(false)
            request.onsuccess = () => {
                const database = request.result
                const done = (saved: boolean) => {
                    database.close()
                    resolve(saved)
                }
                if (!database.objectStoreNames.contains('LokiIncrementalData')) return done(false)
                const key = database.transaction('LokiIncrementalData').objectStore('LokiIncrementalData').getKey('loki')
                key.onsuccess = () => done(key.result !== undefined)
                key.onerror = () => done(false)
            }
        })
    })

const play = (page: Page) => page.getByRole('button', { name: 'Play', exact: true }).click()

test.beforeEach(async ({ page }) => {
    // Records the screen wake locks (headless Chromium does not grant them)
    await page.addInitScript(() => {
        const locks: { released: boolean; release: () => Promise<void>; addEventListener: () => void }[] = []
        Object.assign(window, { wakeLocks: locks })
        Object.defineProperty(navigator, 'wakeLock', {
            value: {
                request: async () => {
                    const lock = {
                        released: false,
                        release: async () => {
                            lock.released = true
                        },
                        addEventListener: () => {},
                    }
                    locks.push(lock)
                    return lock
                },
            },
        })
    })
    // Confirm dialogs (delete) are accepted, messages are collected
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto('./')
    await expect(page.getByTestId('open-file')).toBeVisible()
})

test.describe('import', () => {
    test('imports an mp3 with ID3 chapters as clips at the correct positions', async ({ page }) => {
        await importFile(page, 'chapters.mp3')
        await expect(page.getByTestId('track-0')).toContainText('Testsong')
        await expect(page.getByText('Testsong - Choreo Music Helper')).toBeVisible()

        await openTab(page, 'Clips')
        await expect(page.getByTestId('clip-0')).toContainText('Intro')
        await expect(page.getByTestId('clip-0')).toContainText('0:00.0')
        await expect(page.getByTestId('clip-1')).toContainText('Strophe')
        await expect(page.getByTestId('clip-1')).toContainText('0:04.0')
        await expect(page.getByTestId('clip-2')).toContainText('Refrain')
        await expect(page.getByTestId('clip-2')).toContainText('0:08.0')
        await expect(page.getByTestId('waveform').locator('div').first()).toBeVisible()
    })

    test('imports chapters without title', async ({ page }) => {
        await importFile(page, 'untitled-chapters.mp3')
        await expect(page.getByTestId('track-0')).toContainText('Ohne Kapiteltitel')
        await openTab(page, 'Clips')
        await expect(page.getByTestId('clip-0')).toContainText('Clip 1')
        await expect(page.getByTestId('clip-1')).toContainText('Clip 2')
        await expect(page.getByTestId('clip-1')).toContainText('0:04.0')
        await expect(page.getByTestId('clip-2')).toContainText('Refrain')
    })

    test('imports a file without chapters as one clip', async ({ page }) => {
        await importFile(page, 'plain.mp3')
        await expect(page.getByTestId('track-0')).toContainText('Ohne Kapitel')
        await openTab(page, 'Clips')
        await expect(page.getByTestId('clip-0')).toContainText('Ohne Kapitel')
        await expect(page.getByTestId('clip-1')).toHaveCount(0)
    })

    test('shows a message for files that cannot be decoded and creates no track', async ({ page }) => {
        const message = page.waitForEvent('dialog')
        await importFile(page, 'broken.mp3')
        expect((await message).message()).toContain('konnte nicht importiert werden')
        await expect(page.getByTestId('track-0')).toHaveCount(0)
    })

    test('keeps tracks, clips and the last track after a reload', async ({ page }) => {
        await importFile(page, 'chapters.mp3')
        // Wait until the imported song is selected
        await expect(page.getByTestId('active-track')).toBeVisible()
        await page.reload()
        await expect(page.getByTestId('track-0')).toContainText('Testsong')
        await expect(page.getByTestId('active-track')).toBeVisible()
        await waitForAudio(page, 'a.readyState > 0')
        await openTab(page, 'Clips')
        await expect(page.getByTestId('clip-2')).toContainText('Refrain')
    })
})

test.describe('playback', () => {
    test.beforeEach(async ({ page }) => {
        await importFile(page, 'chapters.mp3')
        await expect(page.getByTestId('track-0')).toBeVisible()
        await waitForAudio(page, 'a.readyState > 0')
    })

    test('can play again after stop', async ({ page }) => {
        await play(page)
        await waitForAudio(page, 'a.currentTime > 1')

        await page.getByRole('button', { name: 'Stop' }).click()
        await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
        const stopped = await audio(page)
        expect(stopped.hasSource).toBe(true)
        expect(stopped.paused).toBe(true)
        expect(stopped.time).toBe(0)

        await play(page)
        await waitForAudio(page, '!a.paused && a.currentTime > 0.5')
        await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    })

    test('shows the correct play state after switching songs during playback', async ({ page }) => {
        await importFile(page, 'plain.mp3')
        const row = (title: string) => page.getByTestId(/^track-\d+$/).filter({ hasText: title })
        await expect(row('Ohne Kapitel').getByTestId('active-track')).toBeVisible()
        await play(page)
        await waitForAudio(page, '!a.paused && a.currentTime > 0.5')
        // Switch to the other song while playing
        await row('Testsong').click()
        await expect(row('Testsong').getByTestId('active-track')).toBeVisible()
        await waitForAudio(page, 'a.readyState > 0 && a.currentTime === 0')
        await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
        expect((await audio(page)).paused).toBe(true)
        // A single tap plays the new song
        await play(page)
        await waitForAudio(page, '!a.paused && a.currentTime > 0.5')
    })

    test('the lead-in volume can be set in browsers that support it', async ({ page }) => {
        await page.getByRole('button', { name: 'Preparation time' }).click()
        await expect(page.getByTestId('lead-in-seconds')).toBeVisible()
        await expect(page.getByTestId('volume-not-supported')).toHaveCount(0)
    })

    test('next and previous clip also work at the start and end', async ({ page }) => {
        await page.getByRole('button', { name: 'Previous clip' }).click()
        expect((await audio(page)).time).toBe(0)
        await page.getByRole('button', { name: 'Next clip' }).click()
        await waitForAudio(page, 'Math.abs(a.currentTime - 4) < 0.05')
        await page.getByRole('button', { name: 'Next clip' }).click()
        await waitForAudio(page, 'Math.abs(a.currentTime - 8) < 0.05')
        await page.getByRole('button', { name: 'Next clip' }).click()
        await page.waitForTimeout(300)
        expect((await audio(page)).time).toBeCloseTo(8, 1)
        await page.getByRole('button', { name: 'Previous clip' }).click()
        await waitForAudio(page, 'Math.abs(a.currentTime - 4) < 0.05')
    })

    test('the back button can restart the current clip', async ({ page }) => {
        await openMenuItem(page, 'Einstellungen')
        await page.getByTestId('back-button-restart').click()
        await openMenuItem(page, 'Musik')
        await page.getByRole('button', { name: 'Next clip' }).click()
        await waitForAudio(page, 'Math.abs(a.currentTime - 4) < 0.05')
        await play(page)
        await waitForAudio(page, 'a.currentTime > 6.5')
        await page.getByRole('button', { name: 'Pause' }).click()
        // Restarts the current clip, pressed again right at its start it goes to the previous clip
        await page.getByRole('button', { name: 'Previous clip' }).click()
        await waitForAudio(page, 'Math.abs(a.currentTime - 4) < 0.05')
        await page.getByRole('button', { name: 'Previous clip' }).click()
        await waitForAudio(page, 'a.currentTime < 0.05')
    })

    test('the compact controls show the times on top of the waveform, which can still be dragged there', async ({
        page,
    }) => {
        await openMenuItem(page, 'Einstellungen')
        await page.getByTestId('player-layout-compact').click()
        await openMenuItem(page, 'Musik')
        await expect(page.getByTestId('player-compact')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Speed' })).toBeVisible()
        // Dragged from the remaining time to the left
        const time = (await page.getByTestId('remaining-time').boundingBox())!
        const waveform = (await page.getByTestId('waveform').boundingBox())!
        expect(time.x).toBeGreaterThan(waveform.x)
        expect(time.y).toBeGreaterThan(waveform.y)
        expect(time.y + time.height).toBeLessThan(waveform.y + waveform.height)
        await page.mouse.move(time.x + time.width / 2, time.y + time.height / 2)
        await page.mouse.down()
        await page.mouse.move(time.x + time.width / 2 - 40, time.y + time.height / 2, { steps: 5 })
        await page.mouse.up()
        await waitForAudio(page, 'a.currentTime > 0.1')
    })

    test('keeps the screen on while playing, unless disabled', async ({ page }) => {
        const locks = () => page.evaluate(() => (window as unknown as { wakeLocks: { released: boolean }[] }).wakeLocks)
        await play(page)
        await expect.poll(async () => (await locks()).filter((lock) => !lock.released).length).toBe(1)
        await openMenuItem(page, 'Einstellungen')
        await page.getByTestId('keep-awake').click()
        await expect.poll(async () => (await locks()).filter((lock) => !lock.released).length).toBe(0)
    })

    test('loops between A and B', async ({ page }) => {
        await openTab(page, 'Clips')
        await page.getByRole('button', { name: 'Loop start 2' }).click()
        await page.getByRole('button', { name: 'Loop end 2' }).click()
        await play(page)
        // Jumps into the loop and back to its start after the end
        await waitForAudio(page, 'a.currentTime > 7.5')
        await waitForAudio(page, 'a.currentTime > 4 && a.currentTime < 5')
    })

    test('restarts a loop whose end is the end of the track', async ({ page }) => {
        await openTab(page, 'Clips')
        await page.getByRole('button', { name: 'Loop start 3' }).click()
        await page.getByRole('button', { name: 'Loop end 3' }).click()
        await play(page)
        await waitForAudio(page, 'a.currentTime > 11.5')
        await waitForAudio(page, '!a.paused && a.currentTime > 8 && a.currentTime < 9')
    })

    test('plays normally when A lies behind B', async ({ page }) => {
        await openTab(page, 'Clips')
        await page.getByRole('button', { name: 'Loop start 3' }).click()
        await page.getByRole('button', { name: 'Loop end 1' }).click()
        // The markers show that this loop is not active
        await expect(page.getByRole('button', { name: 'Loop start 3 (inactive)' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Loop end 1 (inactive)' })).toBeVisible()
        await play(page)
        await waitForAudio(page, 'a.currentTime > 2')
    })

    test('deleting the A clip ends the loop', async ({ page }) => {
        await openTab(page, 'Clips')
        await page.getByRole('button', { name: 'Loop start 1' }).click()
        await page.getByRole('button', { name: 'Loop end 1' }).click()
        await page.getByTestId('clip-0').click({ delay: 900 })
        await page.getByText('Löschen', { exact: true }).click()
        await expect(page.getByTestId('clip-2')).toHaveCount(0)
        await expect(page.getByTestId('clip-0')).toContainText('Strophe')
        await play(page)
        await waitForAudio(page, 'a.currentTime > 4.5')
    })

    test('lead-in input can be cleared and retyped', async ({ page }) => {
        await page.getByRole('button', { name: 'Preparation time' }).click()
        const input = page.getByTestId('lead-in-seconds')
        await input.fill('')
        await expect(input).toHaveValue('')
        await input.fill('3')
        await page.getByTestId('loop-ok').click()
        await expect(page.getByText('-3s')).toBeVisible()
    })

    test('the waveform can be dragged at the start of the track', async ({ page }) => {
        const box = (await page.getByTestId('waveform').boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2, { steps: 5 })
        await page.mouse.up()
        await waitForAudio(page, 'a.currentTime > 0.1')
    })

    test('clears the lock screen metadata when the current song is deleted', async ({ page }) => {
        expect(await page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe('Testsong')
        await page.getByTestId('track-0').click({ delay: 900 })
        await page.getByText('Löschen', { exact: true }).click()
        await expect(page.getByTestId('track-0')).toHaveCount(0)
        await expect.poll(() => page.evaluate(() => navigator.mediaSession.metadata)).toBeNull()
    })

    test('edits and deletes tracks', async ({ page }) => {
        await page.getByTestId('track-0').click({ delay: 900 })
        await page.getByText('Bearbeiten', { exact: true }).click()
        await page.getByTestId('track-title-input').fill('Umbenannt')
        await page.getByTestId('track-ok').click()
        await expect(page.getByTestId('track-0')).toContainText('Umbenannt')
        await expect(page.getByText('Umbenannt - Choreo Music Helper')).toBeVisible()

        await page.getByTestId('track-0').click({ delay: 900 })
        await page.getByText('Löschen', { exact: true }).click()
        await expect(page.getByTestId('track-0')).toHaveCount(0)
        await expect(page.getByText('Choreo Music Helper', { exact: true })).toBeVisible()
        await openTab(page, 'Clips')
        await expect(page.getByText('Noch keine Clips definiert!')).toBeVisible()
        const storedKeys = await page.evaluate(
            () =>
                new Promise<number>((resolve) => {
                    const request = indexedDB.open('keyval-store')
                    request.onsuccess = () => {
                        const count = request.result.transaction('keyval').objectStore('keyval').count()
                        count.onsuccess = () => resolve(count.result)
                    }
                }),
        )
        expect(storedKeys).toBe(0)
    })

    test('provides lock screen metadata and controls', async ({ page }) => {
        const metadata = await page.evaluate(() => ({
            title: navigator.mediaSession.metadata?.title,
            artwork: navigator.mediaSession.metadata?.artwork[0]?.src,
        }))
        expect(metadata.title).toBe('Testsong')
        expect(metadata.artwork).toMatch(/^http.*\.png$/)
        const artwork = await page.request.get(metadata.artwork!)
        expect(artwork.status()).toBe(200)
    })

    test('edits a clip', async ({ page }) => {
        await openTab(page, 'Clips')
        await page.getByTestId('clip-1').click({ delay: 900 })
        await page.getByText('Bearbeiten', { exact: true }).click()
        await page.getByTestId('clip-title-input').fill('Strophe 1')
        await page.getByRole('button', { name: 'Later' }).click()
        await page.getByRole('button', { name: 'Slower' }).click()
        await page.getByTestId('clip-ok').click()
        await expect(page.getByTestId('clip-1')).toContainText('Strophe 1')
        await expect(page.getByTestId('clip-1')).toContainText('0:04.1')
        await expect(page.getByTestId('clip-1')).toContainText('0.99x')
    })
})

test.describe('hosting', () => {
    test('shows the open source licenses', async ({ page }) => {
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
        await page.getByText('Info', { exact: true }).click()
        await page.getByText('Lizenzen', { exact: true }).click()
        await expect(page.getByText('Open-Source-Lizenzen')).toBeVisible()
        await expect(page.getByText(/^@babel\/core \(/)).toBeVisible()
        // Virtualized list: not all of the more than thousand entries are rendered at once
        await expect(page.getByText(/^react-native-track-player \(/)).toHaveCount(0)
        // The license texts with the copyright notices are shipped and can be expanded
        const babel = page.getByTestId('license-@babel/core')
        await expect(babel.getByText(/Copyright/)).toHaveCount(0)
        await babel.getByRole('button', { name: 'Lizenztext anzeigen' }).click()
        await expect(babel.getByText(/Copyright .*Sebastian McKenzie/)).toBeVisible()
        await babel.getByRole('button', { name: 'Lizenztext ausblenden' }).click()
        await expect(babel.getByText(/Copyright/)).toHaveCount(0)
        // The expanded text stays expanded after the entry was scrolled out of the rendered window (the
        // first entries are always rendered, so one further down is used)
        const later = page.getByTestId('license-@babel/plugin-syntax-export-default-from')
        const scrollUntil = async (delta: number, check: () => Promise<void>) => {
            await page.mouse.move(400, 400)
            await expect(async () => {
                await page.mouse.wheel(0, delta)
                await check()
            }).toPass({ timeout: 30_000 })
        }
        await scrollUntil(500, () => expect(later).toBeInViewport({ timeout: 200 }))
        await later.getByRole('button', { name: 'Lizenztext anzeigen' }).click()
        await scrollUntil(5000, () => expect(later).toHaveCount(0, { timeout: 200 }))
        await scrollUntil(-500, () => expect(later).toBeInViewport({ timeout: 200 }))
        await expect(later.getByText(/Copyright .*Sebastian McKenzie/)).toBeVisible()
    })

    test('a new version is not activated while another tab still runs the old one', async ({ page, context }) => {
        const fs = await import('node:fs')
        const swPath = path.join(__dirname, '..', 'dist', 'sw.js')
        const original = fs.readFileSync(swPath, 'utf8')
        const waitingWorker = (target: Page) =>
            target.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)
        try {
            await page.evaluate(async () => {
                await navigator.serviceWorker.ready
            })
            // Make sure the first tab is controlled by the service worker
            await page.reload()
            await expect(page.getByTestId('open-file')).toBeVisible()
            // The tab started before the update below: its start (registration) must be done, otherwise it
            // finds the update while starting as the only tab and activates it (correctly)
            await expect(page.locator('html[data-service-worker-started="true"]')).toHaveCount(1)
            await page.evaluate(() => ((window as unknown as { marker: boolean }).marker = true))
            // Runtime caches of the old version (and of the first version of the app with the default name)
            await page.evaluate(async () => {
                await (await caches.open('runtime')).put('old-chunk.js', new Response('old'))
                await (await caches.open('workbox-runtime-old')).put('old.js', new Response('old'))
            })

            // Deploy a new version and let the first tab find it
            fs.writeFileSync(swPath, `${original}\n// update ${Date.now()}\n`)
            await page.evaluate(async () => {
                const registration = await navigator.serviceWorker.getRegistration()
                await registration?.update()
            })
            await expect.poll(() => waitingWorker(page)).toBe(true)

            // Starting the app in a second tab must not activate it: the first tab still needs the old files
            await expect.poll(() => databaseSaved(page)).toBe(true)
            const second = await context.newPage()
            await second.goto(page.url())
            await expect(second.getByTestId('open-file')).toBeVisible()
            await page.waitForTimeout(1500)
            expect(await waitingWorker(second)).toBe(true)
            expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(true)

            // Once only one tab of the app is left, starting the app activates the new version. Pages of the
            // origin outside the app (e.g. other GitHub Pages sites of the user) do not count.
            const outside = process.env.BASE_PATH ? await context.newPage() : undefined
            await outside?.goto(new URL('/other-site/', page.url()).toString())
            await page.close()
            // The closed tab may still be listed for a moment, then the next start applies the update
            await expect(async () => {
                await second.reload()
                await expect(second.getByTestId('open-file')).toBeVisible()
                await expect.poll(() => waitingWorker(second), { timeout: 3_000 }).toBe(false)
            }).toPass({ timeout: 20_000 })
            // The new version starts with an empty runtime cache
            await expect
                .poll(() => second.evaluate(() => caches.keys()))
                .not.toEqual(expect.arrayContaining([expect.stringMatching(/^(runtime|workbox-runtime-old)$/)]))
            await outside?.close()
            await second.close()
        } finally {
            fs.writeFileSync(swPath, original)
        }
    })

    test('deep links work after a reload', async ({ page }) => {
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
        await page.getByText('Info', { exact: true }).click()
        await expect(page.getByText(/Version: \d/)).toBeVisible()
        expect(new URL(page.url()).pathname).toMatch(/\/info$/)
        await page.reload()
        await expect(page.getByText(/Version: \d/)).toBeVisible()
    })

    test('a deep link with a trailing slash still finds the service worker and the manifest', async ({ browser }) => {
        // Fresh context: no service worker is registered yet
        const context = await browser.newContext()
        const page = await context.newPage()
        try {
            await page.goto(new URL('info/', test.info().project.use.baseURL).toString())
            await expect(page.getByText(/Version: \d/)).toBeVisible()
            const scope = await page.evaluate(() =>
                Promise.race([
                    navigator.serviceWorker.ready.then((registration) => registration.scope),
                    new Promise((resolve) => setTimeout(() => resolve('not registered'), 10_000)),
                ]),
            )
            expect(scope).toBe(test.info().project.use.baseURL)
            const manifest = await page.evaluate(async () => {
                const href = document.querySelector('link[rel="manifest"]')!.getAttribute('href')!
                return (await fetch(href)).json()
            })
            expect(manifest.icons.length).toBeGreaterThan(0)
        } finally {
            await context.close()
        }
    })

    test('works offline after the first visit', async ({ page, context }) => {
        await page.evaluate(async () => {
            await navigator.serviceWorker.ready
        })
        // Load once more so the page is controlled by the service worker
        await page.reload()
        await expect(page.getByTestId('open-file')).toBeVisible()
        await context.setOffline(true)
        // setOffline does not apply to the network requests of the service worker, context.route does
        const blockNetwork = (route: Route) => route.abort('internetdisconnected')
        await context.route('**/*', blockNetwork)
        await page.reload()
        await expect(page.getByTestId('open-file')).toBeVisible()
        // The icon fonts are available offline
        await expect
            .poll(() =>
                page.evaluate(() =>
                    [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family.toLowerCase()),
                ),
            )
            .toEqual(expect.arrayContaining([expect.stringMatching(/material/), expect.stringMatching(/fontawesome6/)]))
        // The license texts are not precached (several MB): a message is shown and they can be loaded later
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
        await page.getByText('Info', { exact: true }).click()
        await page.getByText('Lizenzen', { exact: true }).click()
        await expect(page.getByText(/Lizenzen konnten nicht geladen werden/)).toBeVisible()
        await context.setOffline(false)
        await context.unroute('**/*', blockNetwork)
        await page.getByRole('button', { name: 'Erneut versuchen' }).click()
        await expect(page.getByText(/^@babel\/core \(/)).toBeVisible()
    })

    test('has an installable web app manifest', async ({ page, request }) => {
        const href = await page.locator('link[rel="manifest"]').getAttribute('href')
        const manifestUrl = new URL(href!, page.url()).toString()
        const manifest = await (await request.get(manifestUrl)).json()
        const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
        expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
        for (const icon of manifest.icons) {
            const response = await request.get(new URL(icon.src, manifestUrl).toString())
            expect(response.status(), icon.src).toBe(200)
        }
    })
})

test.describe('settings', () => {
    const openSettings = async (page: Page) => {
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
        await page.getByText('Einstellungen', { exact: true }).click()
    }

    test('shows install instructions and the install button once the browser offers it', async ({ page }) => {
        await openSettings(page)
        await expect(page.getByTestId('install-state')).toContainText('Adressleiste')
        await page.evaluate(() => {
            const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
                prompt: async () => {},
                userChoice: Promise.resolve({ outcome: 'accepted' }),
            })
            window.dispatchEvent(event)
        })
        await page.getByTestId('install-app').click()
        await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
        await expect(page.getByTestId('install-state')).toHaveText('Die App ist installiert.')
    })
})

test.describe('backup', () => {
    const dialogMessages = (page: Page) => {
        const messages: string[] = []
        page.on('dialog', (dialog) => {
            messages.push(dialog.message())
        })
        return messages
    }

    test('restores songs with clips, audio and settings from a backup', async ({ page }) => {
        const messages = dialogMessages(page)
        await importFile(page, 'chapters.mp3')
        await expect(page.getByTestId('track-0')).toContainText('Testsong')
        await page.getByRole('button', { name: 'Preparation time' }).click()
        await page.getByTestId('lead-in-seconds').fill('3')
        await page.getByTestId('loop-ok').click()
        await expect(page.getByText('-3s')).toBeVisible()
        await openMenuItem(page, 'Einstellungen')
        await page.getByTestId('player-layout-compact').click()

        const download = page.waitForEvent('download')
        await page.getByTestId('create-backup').click()
        const file = await (await download).path()
        expect((await download).suggestedFilename()).toMatch(/^choreo-music-helper-\d{4}-\d{2}-\d{2}\.choreobackup$/)
        await expect.poll(() => messages).toContain('Die Sicherung mit 1 Song wurde heruntergeladen.')

        // Everything is lost (deleted song, reset settings)
        await page.getByTestId('player-layout-large').click()
        await openMenuItem(page, 'Musik')
        await page.getByRole('button', { name: 'Preparation time' }).click()
        await page.getByTestId('lead-in-seconds').fill('0')
        await page.getByTestId('loop-ok').click()
        await expect(page.getByText('-3s')).toHaveCount(0)
        await page.getByTestId('track-0').click({ delay: 900 })
        await page.getByText('Löschen', { exact: true }).click()
        await expect(page.getByTestId('track-0')).toHaveCount(0)

        await openMenuItem(page, 'Einstellungen')
        const chooser = page.waitForEvent('filechooser')
        await page.getByTestId('restore-backup').click()
        await (await chooser).setFiles(file)
        await expect.poll(() => messages).toContain('1 Song wurde wiederhergestellt.')

        await openMenuItem(page, 'Musik')
        // The settings of the backup are restored
        await expect(page.getByTestId('player-compact')).toBeVisible()
        await expect(page.getByText('-3s')).toBeVisible()
        await expect(page.getByTestId('track-0')).toContainText('Testsong')
        await page.getByTestId('track-0').click()
        await waitForAudio(page, 'a.readyState > 0 && a.duration > 10')
        await openTab(page, 'Clips')
        await expect(page.getByTestId('clip-2')).toContainText('Refrain')
        await expect(page.getByTestId('clip-2')).toContainText('0:08.0')
    })

    test('restoring over the existing songs keeps them loaded and playable', async ({ page }) => {
        const messages = dialogMessages(page)
        await importFile(page, 'chapters.mp3')
        await expect(page.getByTestId('track-0')).toContainText('Testsong')
        await waitForAudio(page, 'a.readyState > 0')
        await openMenuItem(page, 'Einstellungen')
        const download = page.waitForEvent('download')
        await page.getByTestId('create-backup').click()
        const file = await (await download).path()

        const chooser = page.waitForEvent('filechooser')
        await page.getByTestId('restore-backup').click()
        await (await chooser).setFiles(file)
        await expect.poll(() => messages).toContain('1 Song wurde wiederhergestellt.')

        await openMenuItem(page, 'Musik')
        await expect(page.getByTestId(/^track-\d+$/)).toHaveCount(1)
        await expect(page.getByTestId('track-0').getByTestId('active-track')).toBeVisible()
        await waitForAudio(page, 'a.readyState > 0 && a.duration > 10')
        await play(page)
        await waitForAudio(page, '!a.paused && a.currentTime > 0.5')
    })

    test('rejects files that are no backup', async ({ page }) => {
        const messages = dialogMessages(page)
        await openMenuItem(page, 'Einstellungen')
        const chooser = page.waitForEvent('filechooser')
        await page.getByTestId('restore-backup').click()
        await (await chooser).setFiles(fixture('plain.mp3'))
        await expect
            .poll(() => messages)
            .toContain('Die Datei ist keine gültige Sicherung des Choreo Music Helpers.')
    })
})

test.describe('settings on a phone', () => {
    test.use({
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
    })

    test('the display size makes everything smaller and is kept after a reload', async ({ page }) => {
        const layoutWidth = () => page.evaluate(() => document.documentElement.clientWidth)
        expect(await layoutWidth()).toBe(360)
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).tap()
        await page.getByText('Einstellungen', { exact: true }).tap()
        await expect(page.getByTestId('install-state')).toContainText('Zum Startbildschirm hinzufügen')

        await page.getByTestId('ui-scale-0.8').tap()
        await expect.poll(layoutWidth).toBe(450)
        await page.reload()
        await expect(page.getByTestId('ui-scale-0.8')).toBeVisible()
        await expect.poll(layoutWidth).toBe(450)

        await page.getByTestId('ui-scale-1').tap()
        await expect.poll(layoutWidth).toBe(360)
    })
})
