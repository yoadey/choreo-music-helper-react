import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Set by public/index.html, the events can be fired before the app is loaded. */
type InstallWindow = Window & {
    deferredInstallPrompt?: BeforeInstallPromptEvent
    appInstalled?: boolean
}

const installWindow = () => (typeof window === 'undefined' ? undefined : (window as InstallWindow))

/**
 * - installed: the app runs as installed app (or was just installed)
 * - prompt: the browser can show its install dialog (Chrome, Edge, Samsung Internet)
 * - manual: the app has to be installed with the browser menu, see getInstallPlatform
 * - unsupported: not running in a browser
 */
export type InstallState = 'installed' | 'prompt' | 'manual' | 'unsupported'

export const isRunningInstalled = () => {
    const w = installWindow()
    if (!w) return false
    return (
        w.matchMedia?.('(display-mode: standalone)').matches ||
        w.matchMedia?.('(display-mode: fullscreen)').matches ||
        (w.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
}

export const getInstallState = (): InstallState => {
    const w = installWindow()
    if (Platform.OS !== 'web' || !w) return 'unsupported'
    if (w.appInstalled || isRunningInstalled()) return 'installed'
    if (w.deferredInstallPrompt) return 'prompt'
    return 'manual'
}

const subscribe = (onChange: () => void) => {
    const w = installWindow()
    if (!w) return () => {}
    w.addEventListener('installpromptchange', onChange)
    return () => w.removeEventListener('installpromptchange', onChange)
}

export const useInstallState = () => useSyncExternalStore(subscribe, getInstallState, getInstallState)

/** Shows the install dialog of the browser. Returns true if the app was installed. Never rejects. */
export const promptInstall = async () => {
    const w = installWindow()
    const event = w?.deferredInstallPrompt
    if (!w || !event) return false
    // The event can only be used once
    w.deferredInstallPrompt = undefined
    try {
        await event.prompt()
        const { outcome } = await event.userChoice
        return outcome === 'accepted'
    } catch (error) {
        // E.g. not allowed in this context: the instructions are shown instead
        console.warn('Could not show the install dialog', error)
        return false
    } finally {
        w.dispatchEvent(new Event('installpromptchange'))
    }
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

/** The platform for the manual install instructions. */
export const getInstallPlatform = (userAgent = installWindow()?.navigator.userAgent ?? ''): InstallPlatform => {
    // iPadOS reports itself as Mac, but has touch support
    const isIPad = /Macintosh/.test(userAgent) && (installWindow()?.navigator.maxTouchPoints ?? 0) > 1
    if (/iPhone|iPad|iPod/.test(userAgent) || isIPad) return 'ios'
    // Android tablets request desktop sites by default (Linux user agent), but have touch support
    const isAndroidDesktopMode = /Linux/.test(userAgent) && (installWindow()?.navigator.maxTouchPoints ?? 0) > 0
    if (/Android/.test(userAgent) || isAndroidDesktopMode) return 'android'
    return 'desktop'
}
