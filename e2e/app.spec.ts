import { expect, Page, test } from '@playwright/test'
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

const play = (page: Page) => page.getByRole('button', { name: 'Play', exact: true }).click()

test.beforeEach(async ({ page }) => {
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
    test('deep links work after a reload', async ({ page }) => {
        await page.getByRole('button', { name: /Show navigation menu|Navigationsmenü/ }).click()
        await page.getByText('Info', { exact: true }).click()
        await expect(page.getByText(/Version: \d/)).toBeVisible()
        expect(new URL(page.url()).pathname).toMatch(/\/info$/)
        await page.reload()
        await expect(page.getByText(/Version: \d/)).toBeVisible()
    })

    test('works offline after the first visit', async ({ page, context }) => {
        await page.evaluate(async () => {
            await navigator.serviceWorker.ready
        })
        // Load once more so the page is controlled by the service worker
        await page.reload()
        await expect(page.getByTestId('open-file')).toBeVisible()
        await context.setOffline(true)
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
        await context.setOffline(false)
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
