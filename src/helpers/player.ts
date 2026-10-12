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

/**
 * Loads the track into the player and makes it the current track. The state only changes when the
 * audio could be loaded, so the UI never shows a different track than the player plays.
 */
export const selectTrack = async (track: TrackWithClips, { silent = false } = {}) => {
    const result = await trackLoader.load(track)
    if (result === 'missing') {
        if (!silent) showMessage(t.fileMissing)
        return false
    }
    if (result === 'superseded') return false

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
    clearLastTrack()
    useCurrentTrackStore.getState().setCurrentTrack(null)
}
