import { releaseTrack } from '@/helpers/player'
import { database, flushDatabase, markSaveFailureReported, withOwnSaveFailureReport } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { deleteTrack } from '@/model/trackRepository'
import { clearLastTrack, clearLoop, getLastTrack } from '@/store/playbackState'
import {
    addPendingFile,
    getPendingFiles,
    removePendingFiles,
    removeStoredFile,
    whenPendingFilesUnused,
} from '@/store/pendingFiles'
import { delMany } from 'idb-keyval'
import { Platform } from 'react-native'

/**
 * Deletes the song. It is released from the player first (also a load of it that is in progress), so no
 * action can use the deleted record. The file is only removed once the delete is written; until then it is
 * pending and cleaned up at a later start if the song is gone (see removeOrphanedAudioFiles).
 */
export const removeTrack = (track: TrackWithClips) =>
    // A failed save is reported as failed delete, not additionally by the background save
    withOwnSaveFailureReport(async () => {
        // The loop and the last song are only removed once the song is deleted (below)
        await releaseTrack(track.id, { keepPreferences: true })
        // Until the file is removed (if saving the delete fails, it is cleaned up at a later start)
        if (Platform.OS === 'web') addPendingFile(track.uri)
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
// the database this tab read at its start): only clearly older pending files are cleaned up
const IMPORT_MARGIN = 10 * 60 * 1000

/**
 * Removes pending audio files (see pendingFiles) that no song refers to, e.g. because saving an import or a
 * delete failed. Files that are not pending are never touched.
 */
export const removeOrphanedAudioFiles = async ({
    pending,
    trackUris,
    removeFiles,
    forget,
    startedAt,
}: {
    pending: string[]
    trackUris: () => Promise<string[]>
    removeFiles: (keys: string[]) => Promise<void>
    forget: (keys: string[]) => void
    startedAt: number
}) => {
    // Old file names have no timestamp: such files were stored long ago
    const settled = pending.filter((key) => {
        const timestamp = keyTimestamp(key)
        return Number.isNaN(timestamp) || timestamp < startedAt - IMPORT_MARGIN
    })
    if (settled.length === 0) return
    const referenced = new Set(await trackUris())
    const orphans = settled.filter((key) => !referenced.has(key))
    if (orphans.length > 0) await removeFiles(orphans)
    forget(settled)
}

// Files stored after this (by an import of this session) are never cleaned up as orphans
const appStartedAt = Date.now()

/** Cleans up orphaned audio files once at the start of the app (web only). Never rejects. */
export const cleanUpStoredAudio = async () => {
    if (Platform.OS !== 'web') return
    try {
        // Not while another tab restores a backup, whose files are pending for a long time
        await whenPendingFilesUnused(() =>
            removeOrphanedAudioFiles({
                // Read inside the lock: the restore of another tab may just have finished
                pending: getPendingFiles(),
                trackUris: async () =>
                    (await database.get<TrackWithClips>('tracks').query().fetch()).map((track) => track.uri),
                removeFiles: (orphans) => delMany(orphans),
                forget: removePendingFiles,
                startedAt: appStartedAt,
            }),
        )
    } catch (error) {
        console.warn('Could not clean up the stored audio files', error)
    }
}
