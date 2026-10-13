import { describe, expect, it } from '@jest/globals'
import { BackupContent, createBackupBlob, InvalidBackupError, readBackup } from '../backupFormat'

const readBlob = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(blob)
    })

const track = (id: string, audio: Blob | undefined): BackupContent['tracks'][number] => ({
    id,
    title: `Song ${id} – „Ü“`,
    uri: `/audio/song_${id}.mp3`,
    length: 30000,
    waveform: '[0.1,0.2]',
    color: '#00000000',
    clips: [{ id: `${id}-c1`, title: 'Intro', position: 1.5, color: '#AFB42B', speed: 0.8 }],
    audio,
})

describe('backup file', () => {
    it('contains songs, clips, audio files and settings', async () => {
        const blob = createBackupBlob({
            createdAt: '2026-10-13T10:00:00.000Z',
            settings: { uiScale: '0.9' },
            tracks: [
                track('a', new Blob(['audio of a'], { type: 'audio/mpeg' })),
                track('b', undefined),
                track('c', new Blob(['ccc'], { type: 'audio/mp4' })),
            ],
        })
        const backup = await readBackup(blob)
        expect(backup.createdAt).toBe('2026-10-13T10:00:00.000Z')
        expect(backup.settings).toEqual({ uiScale: '0.9' })
        expect(backup.tracks.map((t) => t.title)).toEqual(['Song a – „Ü“', 'Song b – „Ü“', 'Song c – „Ü“'])
        expect(backup.tracks[0].clips).toEqual(track('a', undefined).clips)
        expect(await readBlob(backup.tracks[0].audio!)).toBe('audio of a')
        expect(backup.tracks[0].audio!.type).toBe('audio/mpeg')
        expect(backup.tracks[1].audio).toBeUndefined()
        expect(await readBlob(backup.tracks[2].audio!)).toBe('ccc')
    })

    it('rejects other and incomplete files', async () => {
        await expect(readBackup(new Blob(['ID3 some mp3 data']))).rejects.toBeInstanceOf(InvalidBackupError)
        const blob = createBackupBlob({
            createdAt: '',
            settings: {},
            tracks: [track('a', new Blob(['audio of a']))],
        })
        // Cut off: the audio file is incomplete
        await expect(readBackup(blob.slice(0, blob.size - 2))).rejects.toBeInstanceOf(InvalidBackupError)
        await expect(readBackup(new Blob(['ChoreoMusicHelperBackup 2 10\n{}'])))
            .rejects.toThrow('unsupported version')
        await expect(readBackup(new Blob(['ChoreoMusicHelperBackup 1 12\n{"tracks":1}'])))
            .rejects.toBeInstanceOf(InvalidBackupError)
    })
})
