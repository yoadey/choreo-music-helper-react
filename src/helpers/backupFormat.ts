import { makeUniqueAudioKey } from './audioImport'

/**
 * Backup file: a first line `ChoreoMusicHelperBackup <version> <header bytes>`, the header (JSON) and the
 * audio files one after another. The audio files are referenced by offset in the header, so a backup is
 * written and read as slices of blobs without loading whole songs into memory (matters on mobile devices).
 */
export const BACKUP_MAGIC = 'ChoreoMusicHelperBackup'
export const BACKUP_VERSION = 1
export const BACKUP_EXTENSION = '.choreobackup'

export type BackupClip = { id: string; title: string; position: number; color: string; speed: number }

export type BackupAudio = { offset: number; size: number; type: string }

export type BackupTrack = {
    id: string
    title: string
    /** Key of the stored audio file */
    uri: string
    length: number
    waveform: string | null
    color: string
    clips: BackupClip[]
    /** null if the audio file was not available when the backup was made */
    audio: BackupAudio | null
}

export type BackupHeader = {
    version: number
    createdAt: string
    settings: Record<string, string>
    tracks: BackupTrack[]
}

export type BackupContent = {
    createdAt: string
    settings: Record<string, string>
    tracks: (Omit<BackupTrack, 'audio'> & { audio: Blob | undefined })[]
}

export class InvalidBackupError extends Error {
    constructor(reason: string) {
        super(`Invalid backup: ${reason}`)
        this.name = 'InvalidBackupError'
    }
}

const readText = (blob: Blob): Promise<string> =>
    typeof blob.text === 'function'
        ? blob.text()
        : new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = () => reject(reader.error)
              reader.readAsText(blob)
          })

/** Creates the backup file. The audio blobs are referenced, not copied. */
export const createBackupBlob = (content: BackupContent): Blob => {
    let offset = 0
    const parts: Blob[] = []
    const tracks: BackupTrack[] = content.tracks.map(({ audio, ...track }) => {
        if (!audio) return { ...track, audio: null }
        const entry = { offset, size: audio.size, type: audio.type }
        offset += audio.size
        parts.push(audio)
        return { ...track, audio: entry }
    })
    const header: BackupHeader = { version: BACKUP_VERSION, createdAt: content.createdAt, settings: content.settings, tracks }
    // UTF-8 encoded by the blob, its size is the byte length
    const headerBlob = new Blob([JSON.stringify(header)])
    const firstLine = `${BACKUP_MAGIC} ${BACKUP_VERSION} ${headerBlob.size}\n`
    return new Blob([firstLine, headerBlob, ...parts], { type: 'application/octet-stream' })
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const validClip = (clip: unknown): clip is BackupClip => {
    const c = clip as Partial<BackupClip> | null
    return !!c && isString(c.id) && isString(c.title) && isNumber(c.position) && isString(c.color) && isNumber(c.speed)
}

const validAudio = (audio: unknown, dataSize: number): audio is BackupAudio | null => {
    if (audio === null) return true
    const a = audio as Partial<BackupAudio>
    return (
        !!a &&
        isNumber(a.offset) &&
        isNumber(a.size) &&
        isString(a.type) &&
        a.offset >= 0 &&
        a.size >= 0 &&
        a.offset + a.size <= dataSize
    )
}

const validTrack = (track: unknown, dataSize: number): track is BackupTrack => {
    const t = track as Partial<BackupTrack> | null
    return (
        !!t &&
        isString(t.id) &&
        isString(t.title) &&
        isString(t.uri) &&
        isNumber(t.length) &&
        (t.waveform === null || isString(t.waveform)) &&
        isString(t.color) &&
        Array.isArray(t.clips) &&
        t.clips.every(validClip) &&
        validAudio(t.audio, dataSize)
    )
}

/** Reads a backup file. Throws InvalidBackupError if it is not a (complete) backup. */
export const readBackup = async (file: Blob): Promise<BackupContent> => {
    const start = await readText(file.slice(0, 100))
    const lineEnd = start.indexOf('\n')
    const [magic, version, headerSize] = (lineEnd < 0 ? '' : start.slice(0, lineEnd)).split(' ')
    if (magic !== BACKUP_MAGIC) throw new InvalidBackupError('not a backup file')
    if (Number(version) !== BACKUP_VERSION) throw new InvalidBackupError(`unsupported version ${version}`)
    const headerStart = lineEnd + 1
    const headerEnd = headerStart + Number(headerSize)
    if (!(Number(headerSize) > 0) || headerEnd > file.size) throw new InvalidBackupError('incomplete file')

    let header: Partial<BackupHeader>
    try {
        header = JSON.parse(await readText(file.slice(headerStart, headerEnd)))
    } catch {
        throw new InvalidBackupError('unreadable header')
    }
    const dataSize = file.size - headerEnd
    if (!header || !Array.isArray(header.tracks) || !header.tracks.every((track) => validTrack(track, dataSize))) {
        throw new InvalidBackupError('invalid songs')
    }
    // Each song and clip once (a restore creates them with these ids)
    const trackIds = header.tracks.map((track) => track.id)
    const clipIds = header.tracks.flatMap((track) => track.clips.map((clip) => clip.id))
    if (new Set(trackIds).size !== trackIds.length || new Set(clipIds).size !== clipIds.length) {
        throw new InvalidBackupError('duplicate ids')
    }
    const settings = Object.fromEntries(
        Object.entries(header.settings ?? {}).filter((entry): entry is [string, string] => isString(entry[1])),
    )
    return {
        createdAt: isString(header.createdAt) ? header.createdAt : '',
        settings,
        tracks: header.tracks.map(({ audio, ...track }) => ({
            ...track,
            audio: audio
                ? file.slice(headerEnd + audio.offset, headerEnd + audio.offset + audio.size, audio.type)
                : undefined,
        })),
    }
}

/**
 * New key for a restored audio file (see makeUniqueAudioKey): with the timestamp of the restore, a pending file
 * is not mistaken for an old orphan by another tab of the app that starts during the restore.
 */
export const restoredAudioKey = (uri: string, timestamp: number) => {
    let name: string
    try {
        name = decodeURIComponent(uri.replace(/^\/audio\//, ''))
    } catch {
        name = 'audio'
    }
    return makeUniqueAudioKey(name.replace(/_\d+(?=(\.[\w-]+)?$)/, ''), timestamp)
}

/**
 * Which audio file a restored song uses:
 * - keep: the file that is stored for the song on this device (the same file as in the backup, or the backup has
 *   no audio for it: a working file is never replaced by a missing one)
 * - write: the audio of the backup is stored as a new file
 * - missing: neither the backup nor this device has the file
 */
export type RestoredAudio = { action: 'keep'; uri: string } | { action: 'write' } | { action: 'missing'; uri: string }

export const resolveRestoredAudio = async ({
    existingUri,
    backupUri,
    hasAudio,
    isStored,
}: {
    /** uri of the song on this device, undefined if it does not exist here */
    existingUri: string | undefined
    backupUri: string
    hasAudio: boolean
    /** Whether the file of the song on this device exists */
    isStored: () => Promise<boolean>
}): Promise<RestoredAudio> => {
    if (!hasAudio) return existingUri !== undefined ? { action: 'keep', uri: existingUri } : { action: 'missing', uri: backupUri }
    if (existingUri !== backupUri) return { action: 'write' }
    return (await isStored()) ? { action: 'keep', uri: existingUri } : { action: 'write' }
}
