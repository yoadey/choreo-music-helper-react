import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { getInstallPlatform, getInstallState, promptInstall } from '../pwa'

type TestWindow = Window & { deferredInstallPrompt?: unknown; appInstalled?: boolean }
const w = window as TestWindow

const installPrompt = (outcome: 'accepted' | 'dismissed') => ({
    prompt: jest.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
})

describe('install as app', () => {
    afterEach(() => {
        delete w.deferredInstallPrompt
        delete w.appInstalled
    })

    it('detects the platform for the instructions', () => {
        expect(getInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari')).toBe('ios')
        expect(getInstallPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140 Mobile')).toBe('android')
        expect(getInstallPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140')).toBe('desktop')
        expect(getInstallPlatform('Mozilla/5.0 (X11; Linux x86_64) Chrome/140')).toBe('desktop')
        // Android tablet in desktop mode
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
        try {
            expect(getInstallPlatform('Mozilla/5.0 (X11; Linux x86_64) Chrome/140')).toBe('android')
        } finally {
            delete (navigator as { maxTouchPoints?: number }).maxTouchPoints
        }
    })

    it('offers the browser dialog if available, otherwise instructions', () => {
        expect(getInstallState()).toBe('manual')
        w.deferredInstallPrompt = installPrompt('dismissed')
        expect(getInstallState()).toBe('prompt')
        w.appInstalled = true
        expect(getInstallState()).toBe('installed')
    })

    it('uses the install dialog only once and reports the result', async () => {
        const event = installPrompt('accepted')
        w.deferredInstallPrompt = event
        const changed = jest.fn()
        window.addEventListener('installpromptchange', changed)

        await expect(promptInstall()).resolves.toBe(true)
        expect(event.prompt).toHaveBeenCalledTimes(1)
        expect(changed).toHaveBeenCalled()
        expect(getInstallState()).toBe('manual')
        await expect(promptInstall()).resolves.toBe(false)
        window.removeEventListener('installpromptchange', changed)
    })
})
