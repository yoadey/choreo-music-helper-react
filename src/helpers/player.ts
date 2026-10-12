import { showMessage } from '@/helpers/dialogs'
import { ensurePlayerSetup } from '@/helpers/playerSetup'
import { createTrackLoader } from '@/helpers/trackLoader'
import { t } from '@/i18n'
import TrackWithClips from '@/model/track'
import { Q, type Database } from '@nozbe/watermelondb'
import { clearLastTrack, clearLoop, getLastTrack, setLastTrack } from '@/store/playbackState'
import { refreshProgress } from '@/store/progress'
import { useCurrentTrackStore } from '@/store/store'
import { get } from 'idb-keyval'
import { Platform } from 'react-native'
import TrackPlayer from 'react-native-track-player'

const trackLoader = createTrackLoader({
    platform: Platform.OS,
    prepare: ensurePlayerSetup,
    getBlob: (key) => get<Blob>(key),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    reset: () => TrackPlayer.reset(),
    // The play state of the new track is synced by the playback service (state "ready")
    load: async (track) => {
        await TrackPlayer.load(track)
    },
})

// Number of track selections, restoring the last track must not replace a selection of the user
let selections = 0

const clearCurrentTrack = () => {
    clearLastTrack()
    useCurrentTrackStore.getState().setCurrentTrack(null)
}

/**
 * Loads the track into the player and makes it the current track. The state only changes when the
 * audio could be loaded, so the UI never shows a different track than the player plays.
 * Never rejects: problems are reported to the user (unless silent) and result in false.
 */
export const selectTrack = async (track: TrackWithClips, { silent = false } = {}) => {
    selections++
    const result = await trackLoader.load(track)
    switch (result) {
        case 'superseded':
            return false
        case 'missing':
        case 'unreadable':
            // The player still plays the previous track
            if (!silent) showMessage(result === 'missing' ? t.fileMissing : t.loadFailed)
            return false
        case 'failed':
            // The player was reset, nothing is loaded anymore
            clearCurrentTrack()
            if (!silent) showMessage(t.loadFailed)
            return false
    }

    if (getLastTrack() !== track.id) {
        clearLoop()
    }
    setLastTrack(track.id)
    useCurrentTrackStore.getState().setCurrentTrack(track)
    return true
}

/**
 * Adds a clip at the current player position, but only if the track is the one loaded in the player
 * (while another track is loading, the position belongs to that track).
 */
export const addClipAtCurrentPosition = async (
    track: TrackWithClips,
    create: (track: TrackWithClips, position: number) => Promise<unknown>,
) => {
    try {
        const activeTrack = await TrackPlayer.getActiveTrack()
        if (activeTrack?.id !== track.id) return
        const { position } = await TrackPlayer.getProgress()
        await create(track, position)
    } catch (error) {
        console.warn('Could not add the clip', error)
        showMessage(t.saveFailed)
    }
}

/**
 * Starts playing. A track that is still loading is played once it is loaded: playing while the player
 * loads makes the web player report "ready" after "playing", so it would not track the playback anymore.
 */
export const playCurrentTrack = async () => {
    await trackLoader.whenIdle()
    await TrackPlayer.play()
}

/**
 * Restores the track selected before the app was closed. The preference is only cleared when the track
 * no longer exists, not when the database could not be read this time.
 */
export const restoreLastTrack = async (database: Database) => {
    const trackId = getLastTrack()
    // The user already selected a song while the app was starting (the UI works before the player)
    if (!trackId || selections > 0) return
    let tracks: TrackWithClips[]
    try {
        tracks = await database.get<TrackWithClips>('tracks').query(Q.where('id', trackId)).fetch()
    } catch (error) {
        console.warn('Could not restore the last track', error)
        return
    }
    if (selections > 0) return
    if (tracks.length === 0) {
        clearLastTrack()
        return
    }
    await selectTrack(tracks[0], { silent: true })
}

/** Unloads the current track, e.g. after it was deleted. */
export const unloadCurrentTrack = async () => {
    // Unloading does not pause the audio element, without it the player would still report "playing"
    await TrackPlayer.pause().catch(() => {
        // The player is not set up, nothing plays
    })
    await trackLoader.unload()
    clearLoop()
    clearCurrentTrack()
    refreshProgress()
}

/**
 * Releases the track before it is deleted: cancels a pending load of it and unloads it if it is the
 * current track (or a pending load of it already replaced the current track in the player).
 */
export const releaseTrack = async (trackId: string) => {
    const stage = trackLoader.cancel(trackId)
    if (stage !== 'player' && useCurrentTrackStore.getState().currentTrack?.id !== trackId) return
    if (trackLoader.isPlayerOwnedByLoad()) {
        // A newer selection is already replacing the track in the player, only the UI state has to go
        clearCurrentTrack()
    } else {
        await unloadCurrentTrack()
    }
}
