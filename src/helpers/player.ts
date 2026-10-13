import { showMessage } from '@/helpers/dialogs'
import { ensurePlayerSetup } from '@/helpers/playerSetup'
import { createTrackLoader, type LoadResult } from '@/helpers/trackLoader'
import { t } from '@/i18n'
import TrackWithClips from '@/model/track'
import { Q, type Database } from '@nozbe/watermelondb'
import { clearLastTrack, clearLoop, getLastTrack, setLastTrack } from '@/store/playbackState'
import { refreshProgress } from '@/store/progress'
import { useCurrentTrackStore } from '@/store/store'
import { get } from 'idb-keyval'
import { Platform } from 'react-native'
import TrackPlayer, { State } from 'react-native-track-player'

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
export const selectTrack = async (track: TrackWithClips, { silent = false } = {}) =>
    (await loadAndSelect(track, silent)) === 'loaded'

/** Tells the user why a song could not be loaded and updates the current song. */
const handleLoadResult = (result: LoadResult, silent: boolean) => {
    // The player holds the new song or nothing
    if (result === 'loaded' || result === 'failed') droppedAt = undefined
    switch (result) {
        case 'missing':
        case 'unreadable':
            // The player still plays the previous track
            if (!silent) showMessage(result === 'missing' ? t.fileMissing : t.loadFailed)
            break
        case 'failed':
            // The player was reset, nothing is loaded anymore. The last song is kept (with its loop), as no
            // other song was loaded
            useCurrentTrackStore.getState().setCurrentTrack(null)
            if (!silent) showMessage(t.loadFailed)
            break
    }
}

const loadAndSelect = async (track: TrackWithClips, silent: boolean): Promise<LoadResult> => {
    selections++
    // Selecting the loaded song again keeps it playing (unless another song is loading, which it replaces).
    // Decided right away, so the last selection always wins.
    const current = useCurrentTrackStore.getState().currentTrack
    if (current?.id === track.id) {
        // The player dropped it after an error: loaded again at the position of the error (or that reload,
        // if it is running, is used)
        if (dropReload) return dropReload
        if (!trackLoader.isLoading()) return droppedAt === undefined ? 'loaded' : reloadDropped(current)
    }
    const result = await trackLoader.load(track)
    handleLoadResult(result, silent)
    if (result !== 'loaded') return result

    if (getLastTrack() !== track.id) {
        clearLoop()
    }
    setLastTrack(track.id)
    useCurrentTrackStore.getState().setCurrentTrack(track)
    return result
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
        // After an error the player reports position 0: the song is loaded again at the position of the error
        if (droppedAt !== undefined && !(await ensureTrackLoaded())) return
        const activeTrack = await TrackPlayer.getActiveTrack()
        if (activeTrack?.id !== track.id) return
        const { position } = await TrackPlayer.getProgress()
        await create(track, position)
    } catch (error) {
        console.warn('Could not add the clip', error)
        showMessage(t.saveFailed)
    }
}

/** True while a song is being loaded into the player. */
export const isTrackLoading = () => trackLoader.isLoading()

/** Resolves when no song is being loaded anymore. */
export const whenTrackIdle = () => trackLoader.whenIdle()

// The web player unloads the song on errors (e.g. a decode error during playback) but still reports it as
// active track, at position 0. The position of the error, while the song is dropped: it is loaded again
// (at that position) before it is used.
let droppedAt: number | undefined
// The running reload of the dropped song, shared by all actions that need the song
let dropReload: Promise<LoadResult> | undefined

/**
 * Called when the player reported an error, with the position the song was at. A further error of the
 * emptied player (at 0) keeps the first position.
 */
export const markPlayerFailed = (position: number) => {
    droppedAt ??= position
}

/** True if the player dropped the current song after an error. */
export const isTrackDropped = () => droppedAt !== undefined

/**
 * Loads the current song again if the player dropped it, at the position of the error. Returns false if
 * there is no usable song.
 */
export const ensureTrackLoaded = async () => {
    const current = useCurrentTrackStore.getState().currentTrack
    if (!current) return false
    if (droppedAt === undefined && !dropReload) return true
    return (await reloadDropped(current)) === 'loaded'
}

const reloadDropped = (track: TrackWithClips): Promise<LoadResult> => {
    dropReload ??= (async () => {
        const position = droppedAt ?? 0
        const result = await trackLoader.load(track)
        handleLoadResult(result, false)
        if (result !== 'loaded') return result
        if (position > 0) await TrackPlayer.seekTo(position)
        // The reload published 0:00
        await refreshProgress()
        return result
    })().finally(() => {
        dropReload = undefined
    })
    return dropReload
}

// Increased by every start and pause: a start that waits (for a load) is dropped if the user paused meanwhile
let playRequests = 0

/** Cancels a start of playback that still waits for a load (e.g. on pause). */
export const cancelPendingPlay = () => {
    playRequests++
}

/**
 * Starts playing the current song. Called directly in the click handler: browsers only allow starting
 * audio during a user interaction (when nothing is loading, play() is called synchronously). A song that is
 * still loading is played once it is loaded (playing while the player loads makes the web player report
 * "ready" after "playing"). If the browser refuses to start, the UI is reset to "paused".
 */
export const playCurrentTrack = async ({ unlessLoading = false } = {}) => {
    const request = ++playRequests
    try {
        if (trackLoader.isLoading()) {
            // E.g. a loop restart must not start a song the user only selected
            if (unlessLoading) return
            await trackLoader.whenIdle()
        }
        if (!useCurrentTrackStore.getState().currentTrack) return
        // (Only awaited when needed: otherwise play() is called synchronously)
        if (droppedAt !== undefined && !(await ensureTrackLoaded())) return
        // Paused (or started again) while waiting
        if (request !== playRequests) return
        await TrackPlayer.play()
        // The web player only logs a refused start (it resolves anyway) but keeps "play when ready"
        const { state } = await TrackPlayer.getPlaybackState()
        if (state !== State.Playing && state !== State.Buffering) {
            await TrackPlayer.setPlayWhenReady(false)
        }
    } catch (error) {
        // E.g. the player is not set up (yet)
        console.warn('Could not start playing', error)
    }
}

/**
 * Restores the track selected before the app was closed. The preference is only cleared when the track or
 * its audio file no longer exists, not when the database or the file could not be read this time.
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
    const result = await loadAndSelect(tracks[0], true)
    // The file is gone for good: otherwise the clips and the loop of a song that is not loaded would be used
    // (e.g. the loop shown as active). A read error can be temporary, then the song and its loop are kept.
    if (result === 'missing') clearLastTrack()
}

/** Unloads the current track, e.g. after it was deleted (not a song selected meanwhile). */
export const unloadCurrentTrack = async () => {
    const owner = trackLoader.owner()
    const current = useCurrentTrackStore.getState().currentTrack
    // Unloading does not pause the audio element, without it the player would still report "playing"
    await TrackPlayer.pause().catch(() => {
        // The player is not set up, nothing plays
    })
    // A song selected meanwhile owns the player now: it stays
    if (!(await trackLoader.unload({ ifOwner: owner }))) return
    if (useCurrentTrackStore.getState().currentTrack !== current) return
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
