import TrackPlayer from 'react-native-track-player'
import { create } from 'zustand'

type PlayerProgress = { position: number; duration: number }

/**
 * Player progress, polled once for the whole app. Components subscribe with a selector at the precision
 * they need, e.g. `usePlayerProgressStore((p) => Math.floor(p.position))`, instead of each polling the player.
 */
export const usePlayerProgressStore = create<PlayerProgress>()(() => ({ position: 0, duration: 0 }))

/** Starts polling the player progress, returns a function that stops it. */
export const startProgressPolling = (intervalMs: number) => {
    let running = false
    const timer = setInterval(() => {
        if (running) return
        running = true
        TrackPlayer.getProgress()
            .then(({ position, duration }) => {
                const current = usePlayerProgressStore.getState()
                if (current.position !== position || current.duration !== duration) {
                    usePlayerProgressStore.setState({ position, duration })
                }
            })
            .catch(() => {
                // The player is not set up yet
            })
            .finally(() => {
                running = false
            })
    }, intervalMs)
    return () => clearInterval(timer)
}
