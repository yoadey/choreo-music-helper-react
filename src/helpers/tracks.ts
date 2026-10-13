import { releaseTrack } from '@/helpers/player'
import { database, flushDatabase, markSaveFailureReported, withOwnSaveFailureReport } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { deleteTrack } from '@/model/trackRepository'
import { clearLastTrack, clearLoop, getLastTrack } from '@/store/playbackState'
import { del, keys } from 'idb-keyval'
import { Platform } from 'react-native'

const removeStoredFile = async (key: string) => {
    if (Platform.OS === 'web') await del(key)
}

/**
 * Deletes the song. It is released from the player first (also a load of it that is in progress), so no
 * action can use the deleted record. The file is only removed once the delete is written; if that fails, the
 * file stays and is cleaned up at a later start if the song is gone (see removeOrphanedAudioFiles).
 */
export const removeTrack = (track: TrackWithClips) =>
    // A failed save is reported as failed delete, not additionally by the background save
    withOwnSaveFailureReport(async () => {
        await releaseTrack(track.id)
        await deleteTrack(database, track, removeStoredFile, async () => {
            try {
                await flushDatabase()
            } catch (error) {
                // Reported as failed delete
                markSaveFailureReported()
                throw error
            }
        })
        // E.g. the remembered song could not be loaded at the start, its loop markers refer to its clips
        if (getLastTrack() === track.id) {
            clearLastTrack()
            clearLoop()
        }
    })

/** Timestamp in the name of a stored audio file (see makeUniqueAudioKey), NaN if there is none. */
const keyTimestamp = (key: string) => Number(/_(\d+)(?:\.[\w-]+)?$/.exec(decodeURIComponent(key))?.[1])

// A running import stores its file shortly before its song (also in another tab, whose song may not be in
// the database this tab read at its start): only files that are clearly older are cleaned up
const IMPORT_MARGIN = 10 * 60 * 1000

/**
 * Removes stored audio files that no song refers to (e.g. the save of a delete failed after the song was
 * removed). Only files stored well before the app started (see IMPORT_MARGIN).
 */
export const removeOrphanedAudioFiles = async ({
    keys,
    trackUris,
    removeFile,
    startedAt,
}: {
    keys: () => Promise<IDBValidKey[]>
    trackUris: () => Promise<string[]>
    removeFile: (key: string) => Promise<void>
    startedAt: number
}) => {
    const [stored, used] = await Promise.all([keys(), trackUris()])
    const referenced = new Set(used)
    const orphans = stored.filter(
        (key): key is string =>
            typeof key === 'string' &&
            key.startsWith('/audio/') &&
            !referenced.has(key) &&
            keyTimestamp(key) < startedAt - IMPORT_MARGIN,
    )
    for (const key of orphans) await removeFile(key)
}

// Files stored after this (by an import of this session) are never cleaned up as orphans
const appStartedAt = Date.now()

/** Cleans up orphaned audio files once at the start of the app (web only). Never rejects. */
export const cleanUpStoredAudio = async () => {
    if (Platform.OS !== 'web') return
    try {
        await removeOrphanedAudioFiles({
            keys: () => keys(),
            trackUris: async () =>
                (await database.get<TrackWithClips>('tracks').query().fetch()).map((track) => track.uri),
            removeFile: (key) => del(key),
            startedAt: appStartedAt,
        })
    } catch (error) {
        console.warn('Could not clean up the stored audio files', error)
    }
}
