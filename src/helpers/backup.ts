import { BACKUP_EXTENSION, createBackupBlob, InvalidBackupError, readBackup } from '@/helpers/backupFormat'
import { releaseTrack, selectTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database, flushDatabase, withOwnSaveFailureReport } from '@/model/index.web'
import { isQuotaError } from '@/model/saveErrors'
import TrackWithClips from '@/model/track'
import { readAllTracks, restoreTracks } from '@/model/trackRepository'
import { preferences } from '@/store/playbackState'
import { addPendingFile, removePendingFiles, removeStoredFile } from '@/store/pendingFiles'
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

/** Saves all songs with their clips, audio files and the settings as one file. Returns the number of songs. */
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
        tracks: await Promise.all(
            tracks.map(async (track) => ({ ...track, audio: await get<Blob>(track.uri).catch(() => undefined) })),
        ),
    }
    download(createBackupBlob(content), backupFileName(new Date()))
    return tracks.length
}

/** Message for a failed restore */
export const restoreErrorMessage = (error: unknown) =>
    error instanceof InvalidBackupError ? t.backupInvalid : isQuotaError(error) ? t.storageFull : t.restoreFailed

/**
 * Restores a backup file: songs of the backup are added, songs that exist (same song) are replaced, all other
 * songs stay. The settings of the backup are applied. Returns the number of restored songs.
 */
export const restoreBackup = async (file: Blob) => {
    const backup = await readBackup(file)
    const restoredIds = new Set(backup.tracks.map((track) => track.id))
    const current = useCurrentTrackStore.getState().currentTrack
    const reloadCurrent = !!current && restoredIds.has(current.id)
    // The current song gets new clips and maybe a new file: it is loaded again afterwards
    if (reloadCurrent) await releaseTrack(current.id, { keepPreferences: true })

    // Pending until the songs are saved, otherwise cleaned up at a later start (see removeOrphanedAudioFiles)
    const files = backup.tracks.filter((track) => track.audio)
    for (const track of files) {
        addPendingFile(track.uri)
        await set(track.uri, track.audio)
    }
    const unusedFiles = await withOwnSaveFailureReport(async () => {
        const unused = await restoreTracks(database, backup.tracks)
        await flushDatabase()
        return unused
    })
    removePendingFiles(files.map((track) => track.uri))
    for (const key of unusedFiles) {
        await removeStoredFile(key).catch((error) => console.warn(`Could not remove the audio file ${key}`, error))
    }

    for (const key of SETTINGS_KEYS) {
        const value = backup.settings[key]
        if (value !== undefined) preferences.set(key, value)
    }
    applyUiScale()

    if (reloadCurrent) {
        const track = await database.get<TrackWithClips>('tracks').find(current.id)
        await selectTrack(track, { silent: true })
    }
    return backup.tracks.length
}

/** Lets the user pick a backup file. Returns undefined if no file was picked. */
export const pickBackupFile = async (): Promise<Blob | undefined> => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false })
    if (result.canceled || !result.assets?.length) return undefined
    const asset = result.assets[0]
    try {
        return asset.file ?? (await (await fetch(asset.uri)).blob())
    } finally {
        // The picker creates an object URL for the file, which keeps the file in memory
        if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri)
    }
}
