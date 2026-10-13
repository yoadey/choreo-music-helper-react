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

// Last exact position of the player (the published one is rounded while the app is hidden), e.g. the
// position of a player error
let lastPlayerPosition = 0

export const getLastPlayerPosition = () => lastPlayerPosition

/** Notes the exact position of the player (from its events, or 0 for a newly loaded song). */
export const noteLastPlayerPosition = (position: number) => {
    lastPlayerPosition = position
}

/** Reads the progress from the player once, e.g. after a seek, a state change or a track change. */
export const refreshProgress = async () => {
    try {
        const { position, duration } = await TrackPlayer.getProgress()
        lastPlayerPosition = position
        publishProgress(position, duration)
    } catch {
        // The player is not set up yet
    }
}
