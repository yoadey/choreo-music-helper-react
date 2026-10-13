import TrackPlayer from 'react-native-track-player'
import { create } from 'zustand'

type PlayerProgress = { position: number; duration: number }

/**
 * Player progress, shared by the whole app. Components subscribe with a selector at the precision
 * they need, e.g. `usePlayerProgressStore((p) => Math.floor(p.position))`, instead of each polling the player.
 * While playing, the playback service publishes the progress events of the player.
 */
export const usePlayerProgressStore = create<PlayerProgress>()(() => ({ position: 0, duration: 0 }))

/** Publishes a progress, subscribers are only notified if it changed. */
export const publishProgress = (position: number, duration: number) => {
    const current = usePlayerProgressStore.getState()
    if (current.position !== position || current.duration !== duration) {
        usePlayerProgressStore.setState({ position, duration })
    }
}

/** Reads the progress from the player once, e.g. after a seek, a state change or a track change. */
export const refreshProgress = async () => {
    try {
        const { position, duration } = await TrackPlayer.getProgress()
        publishProgress(position, duration)
    } catch {
        // The player is not set up yet
    }
}
