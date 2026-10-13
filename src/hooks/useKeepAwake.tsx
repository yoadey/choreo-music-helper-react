import { useKeepAwakeSetting } from '@/store/settings'
import { useEffect, useState } from 'react'
import { useIsPlaying } from 'react-native-track-player'

/** The screen stays on for this long after the playback stopped, e.g. to walk back to the start position. */
export const KEEP_AWAKE_AFTER_PLAYBACK = 5 * 60 * 1000

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener: (type: 'release', listener: () => void) => void }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }

/** False if the browser cannot keep the screen on (Screen Wake Lock API), the setting is hidden then. */
export const isKeepAwakeSupported = () =>
    typeof navigator !== 'undefined' && !!(navigator as WakeLockNavigator).wakeLock

/** True while playing and for KEEP_AWAKE_AFTER_PLAYBACK after the playback stopped. */
const useRecentlyPlaying = () => {
    const playing = !!useIsPlaying().playing
    const [recentlyPlayed, setRecentlyPlayed] = useState(false)
    // Updated while rendering (not in an effect), see https://react.dev/learn/you-might-not-need-an-effect
    const [wasPlaying, setWasPlaying] = useState(playing)
    if (playing !== wasPlaying) {
        setWasPlaying(playing)
        if (playing) setRecentlyPlayed(true)
    }
    useEffect(() => {
        if (playing) return undefined
        const timer = setTimeout(() => setRecentlyPlayed(false), KEEP_AWAKE_AFTER_PLAYBACK)
        return () => clearTimeout(timer)
    }, [playing])
    return playing || recentlyPlayed
}

/**
 * Keeps the screen on while playing (if enabled in the settings), so it does not turn off during a rehearsal.
 * Uses the Screen Wake Lock API; browsers without it just keep their normal behavior.
 */
export const useKeepAwake = () => {
    const [enabled] = useKeepAwakeSetting()
    const active = useRecentlyPlaying()
    const wanted = enabled && active

    useEffect(() => {
        const wakeLock = typeof navigator === 'undefined' ? undefined : (navigator as WakeLockNavigator).wakeLock
        if (!wanted || !wakeLock || typeof document === 'undefined') return undefined
        let sentinel: WakeLockSentinelLike | undefined
        let requesting = false
        let stopped = false

        const acquire = async () => {
            // Only one request at a time (e.g. the app becomes visible while the first one is pending)
            if (stopped || requesting || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) {
                return
            }
            requesting = true
            try {
                const lock = await wakeLock.request('screen')
                if (stopped) {
                    await lock.release()
                } else {
                    sentinel = lock
                }
            } catch (error) {
                // E.g. battery saver mode or not allowed, the screen just turns off as usual
                console.warn('Could not keep the screen on', error)
            } finally {
                requesting = false
            }
        }
        // The browser releases the lock when the app is hidden, it is requested again once it is visible
        const onVisibilityChange = () => {
            acquire()
        }

        acquire()
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            stopped = true
            document.removeEventListener('visibilitychange', onVisibilityChange)
            sentinel?.release().catch(() => undefined)
        }
    }, [wanted])
}
