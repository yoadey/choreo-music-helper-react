import { requestPersistentStorage } from '@/helpers/audio'
import { BACKUP_EXTENSION, createBackupBlob, InvalidBackupError, readBackup, resolveRestoredAudio, restoredAudioKey } from '@/helpers/backupFormat'
import { isTrackLoading, releaseTrack, selectTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database, flushDatabase, markSaveFailureReported, withOwnSaveFailureReport } from '@/model/index.web'
import { isQuotaError } from '@/model/saveErrors'
import TrackWithClips from '@/model/track'
import { readAllTracks, removeTracksById, restoreTracks, type TrackData } from '@/model/trackRepository'
import { preferences } from '@/store/playbackState'
import { addPendingFile, removePendingFiles, removeStoredFile, whilePendingFilesInUse } from '@/store/pendingFiles'
import { applyUiScale, SETTINGS_KEYS } from '@/store/settings'
import { useCurrentTrackStore } from '@/store/store'
import * as DocumentPicker from 'expo-document-picker'
import { get, set } from 'idb-keyval'
import { Platform } from 'react-native'

/** Backups need the stored audio files, which only exist on the web. */
export const isBackupSupported = Platform.OS === 'web'

const backupFileName = (date: Date) => `choreo-music-helper-${date.toISOString().slice(0, 10)}${BACKUP_EXTENSION}`

const download = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Some browsers read the file after the click returned
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Saves all songs with their clips, audio files and the settings as one file. Rejects if an audio file cannot be
 * read (a backup must not lose audio silently). Returns the number of songs and of songs whose file is missing
 * on this device (they cannot be played here either).
 */
export const createBackup = async () => {
    const tracks = await readAllTracks(database)
    const settings: Record<string, string> = {}
    for (const key of SETTINGS_KEYS) {
        const value = preferences.getString(key)
        if (value !== undefined) settings[key] = value
    }
    const content = {
        createdAt: new Date().toISOString(),
        settings,
        tracks: await Promise.all(tracks.map(async (track) => ({ ...track, audio: await get<Blob>(track.uri) }))),
    }
    download(createBackupBlob(content), backupFileName(new Date()))
    return { songs: tracks.length, missingAudio: content.tracks.filter((track) => !track.audio).length }
}

/** Message for a failed restore */
export const restoreErrorMessage = (error: unknown) =>
    error instanceof InvalidBackupError ? t.backupInvalid : isQuotaError(error) ? t.storageFull : t.restoreFailed

/** Loads the song (again). Never rejects. */
const reloadTrack = async (trackId: string) => {
    try {
        await selectTrack(await database.get<TrackWithClips>('tracks').find(trackId), { silent: true })
    } catch (error) {
        console.warn('Could not load the song again after the restore', error)
    }
}

/**
 * After the restore: the song the user had selected is loaded again, also a restored song that was selected
 * while the restore ran (it was loaded with its previous file and clips). Never rejects.
 */
const reloadSelection = async (restoredIds: readonly string[], selectedBefore: string | undefined) => {
    const current = useCurrentTrackStore.getState().currentTrack
    if (current && restoredIds.includes(current.id)) {
        await releaseTrack(current.id, { keepPreferences: true }).catch(() => 'none')
        await reloadTrack(current.id)
    } else if (selectedBefore && !current && !isTrackLoading()) {
        await reloadTrack(selectedBefore)
    }
}

/** Saves the database. If that fails, the restore is undone (in memory) and the failure is reported once. */
const saveOrUndo = async (undo: () => Promise<void>) => {
    try {
        await flushDatabase()
    } catch (error) {
        // Reported as failed restore
        markSaveFailureReported()
        await undo().catch((undoError) => console.warn('Could not undo the restore', undoError))
        throw error
    }
}

/**
 * Restores a backup file: songs of the backup are added, songs that exist (same song) are replaced, all other
 * songs stay. The settings of the backup are applied. Returns the number of restored songs.
 */
export const restoreBackup = async (file: Blob) => {
    const backup = await readBackup(file)
    const restoredIds = backup.tracks.map((track) => track.id)
    // The restored songs get new clips and maybe a new file: they are released from the player (also a load in
    // progress), the selected one is loaded again afterwards (also after a failure). A song that is loading is
    // the latest selection of the user.
    let selectedBefore: string | undefined
    for (const id of restoredIds) {
        const released = await releaseTrack(id, { keepPreferences: true })
        if (released === 'loading' || (released === 'current' && !selectedBefore)) selectedBefore = id
    }
    // Other tabs do not clean up the pending files while the restore runs (it can take long)
    return whilePendingFilesInUse(async () => {
        try {
            const previous = (await readAllTracks(database)).filter((track) => restoredIds.includes(track.id))
            const existingUris = new Map(previous.map((track) => [track.id, track.uri]))
            // Pending until the songs are saved, otherwise cleaned up at a later start (see removeOrphanedAudioFiles)
            const written: string[] = []
            // Files of this device that are replaced, removed once the restore is saved (pending until then: if
            // that is interrupted they are cleaned up at a later start, as long as no song refers to them)
            const replaced: string[] = []
            const tracks: TrackData[] = []
            let lastTimestamp = 0
            for (const { audio, ...track } of backup.tracks) {
                const existingUri = existingUris.get(track.id)
                const resolved = await resolveRestoredAudio({
                    existingUri,
                    backupUri: track.uri,
                    hasAudio: !!audio,
                    isStored: async () => (await get<Blob>(track.uri)) !== undefined,
                })
                if (resolved.action !== 'write' || !audio) {
                    tracks.push({ ...track, uri: resolved.action === 'write' ? track.uri : resolved.uri })
                    continue
                }
                lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
                const uri = restoredAudioKey(track.uri, lastTimestamp)
                addPendingFile(uri)
                written.push(uri)
                await set(uri, audio)
                tracks.push({ ...track, uri })
                if (existingUri !== undefined) replaced.push(existingUri)
            }
            replaced.forEach(addPendingFile)
            await withOwnSaveFailureReport(async () => {
                await restoreTracks(database, tracks)
                await saveOrUndo(async () => {
                    // The previous songs come back, songs that did not exist are removed again
                    await restoreTracks(database, previous)
                    await removeTracksById(
                        database,
                        restoredIds.filter((id) => !existingUris.has(id)),
                    )
                    removePendingFiles(replaced)
                    for (const key of written) await removeStoredFile(key).catch(() => undefined)
                })
            })
            removePendingFiles(written)
            for (const key of replaced) {
                await removeStoredFile(key).catch((error) =>
                    console.warn(`Could not remove the audio file ${key}`, error),
                )
            }
            // Not awaited: some browsers ask the user and may never answer
            requestPersistentStorage().catch(() => undefined)

            for (const key of SETTINGS_KEYS) {
                const value = backup.settings[key]
                if (value !== undefined) preferences.set(key, value)
            }
            applyUiScale()
            return backup.tracks.length
        } finally {
            await reloadSelection(restoredIds, selectedBefore)
        }
    })
}

/** Lets the user pick a backup file. Returns undefined if no file was picked. */
export const pickBackupFile = async (): Promise<Blob | undefined> => {
    // Without base64 the picker would read the whole file into a string (the backup can be hundreds of MB)
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false, base64: false })
    if (result.canceled || !result.assets?.length) return undefined
    const asset = result.assets[0]
    try {
        return asset.file ?? (await (await fetch(asset.uri)).blob())
    } finally {
        // The picker creates an object URL for the file, which keeps the file in memory
        if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri)
    }
}
