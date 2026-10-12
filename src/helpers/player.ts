import { showMessage } from '@/helpers/dialogs'
import { createTrackLoader } from '@/helpers/trackLoader'
import { t } from '@/i18n'
import TrackWithClips from '@/model/track'
import { clearLastTrack, clearLoop, getLastTrack, setLastTrack } from '@/store/playbackState'
import { useCurrentTrackStore } from '@/store/store'
import { get } from 'idb-keyval'
import { Platform } from 'react-native'
import TrackPlayer from 'react-native-track-player'

const trackLoader = createTrackLoader({
    platform: Platform.OS,
    getBlob: (key) => get<Blob>(key),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    reset: () => TrackPlayer.reset(),
    load: async (track) => {
        await TrackPlayer.load(track)
    },
})

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

/** Unloads the current track, e.g. after it was deleted. */
export const unloadCurrentTrack = async () => {
    await trackLoader.unload()
    clearLoop()
    clearCurrentTrack()
}
