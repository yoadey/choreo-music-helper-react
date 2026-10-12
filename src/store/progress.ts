import TrackPlayer from 'react-native-track-player'
import { create } from 'zustand'

type PlayerProgress = { position: number; duration: number }

/**
 * Player progress, shared by the whole app. Components subscribe with a selector at the precision
 * they need, e.g. `usePlayerProgressStore((p) => Math.floor(p.position))`, instead of each polling the player.
 */
export const usePlayerProgressStore = create<PlayerProgress>()(() => ({ position: 0, duration: 0 }))

/** Reads the progress from the player once, e.g. after a seek, a state change or a track change. */
export const refreshProgress = async () => {
    try {
        const { position, duration } = await TrackPlayer.getProgress()
        const current = usePlayerProgressStore.getState()
        if (current.position !== position || current.duration !== duration) {
            usePlayerProgressStore.setState({ position, duration })
        }
    } catch {
        // The player is not set up yet
    }
}

/**
 * Polls the progress while isActive() returns true (playing and visible). Otherwise nothing runs:
 * changes while paused are published with refreshProgress. Returns a function that stops polling.
 */
export const startProgressPolling = (intervalMs: number, isActive: () => boolean) => {
    let running = false
    const timer = setInterval(() => {
        if (running || !isActive()) return
        running = true
        refreshProgress().finally(() => {
            running = false
        })
    }, intervalMs)
    return () => clearInterval(timer)
}
