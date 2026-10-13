import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import Clip from '../clip'
import schema from '../schema'
import TrackWithClips from '../track'
import { createClip, createTrackWithClips, deleteClip, deleteTrack } from '../trackRepository'

const createTestDatabase = () =>
    new Database({
        adapter: new LokiJSAdapter({
            schema,
            useWebWorker: false,
            useIncrementalIndexedDB: false,
            dbName: `test-${Math.random()}`,
        }),
        modelClasses: [TrackWithClips, Clip],
    })

const imported = {
    key: '/audio/song_1.mp3',
    name: 'song.mp3',
    title: 'Song',
    lengthMs: 30000,
    waveform: [0.1, 0.2],
    clips: [
        { title: 'Intro', position: 0, color: '#00000000' },
        { title: 'Refrain', position: 12.5, color: '#00000000' },
    ],
}

describe('trackRepository', () => {
    let database: Database

    beforeEach(() => {
        database = createTestDatabase()
    })

    it('creates a track with its clips', async () => {
        const track = await createTrackWithClips(database, imported)
        expect(track.title).toBe('Song')
        expect(track.uri).toBe('/audio/song_1.mp3')
        expect(track.length).toBe(30000)
        const clips = await track.clips.fetch()
        expect(clips.map((c) => [c.title, c.position, c.speed])).toEqual(
            expect.arrayContaining([
                ['Intro', 0, 1],
                ['Refrain', 12.5, 1],
            ]),
        )
    })

    it('deletes the clips together with the track', async () => {
        const track = await createTrackWithClips(database, imported)
        const removeFile = jest.fn(async () => undefined)
        await deleteTrack(database, track, removeFile)
        expect(await database.get<TrackWithClips>('tracks').query().fetchCount()).toBe(0)
        expect(await database.get<Clip>('clips').query().fetchCount()).toBe(0)
        expect(removeFile).toHaveBeenCalledWith('/audio/song_1.mp3')
    })

    it('deletes the track even if the audio file cannot be removed', async () => {
        const track = await createTrackWithClips(database, imported)
        const removeFile = jest.fn(async () => {
            throw new Error('IndexedDB transaction failed')
        })
        await expect(deleteTrack(database, track, removeFile)).resolves.toBeUndefined()
        expect(await database.get<TrackWithClips>('tracks').query().fetchCount()).toBe(0)
    })

    it('removes the audio file only after the delete was written (otherwise the song returns without file)', async () => {
        const track = await createTrackWithClips(database, imported)
        const removeFile = jest.fn(async () => undefined)
        const persist = jest.fn(async () => {
            throw new Error('storage full')
        })
        await expect(deleteTrack(database, track, removeFile, persist)).rejects.toThrow('storage full')
        expect(removeFile).not.toHaveBeenCalled()
    })

    it('deletes a single clip', async () => {
        const track = await createTrackWithClips(database, imported)
        const [clip] = await track.clips.fetch()
        await deleteClip(database, clip)
        expect(await track.clips.fetchCount()).toBe(1)
    })

    it('creates a clip with the default values', async () => {
        const track = await createTrackWithClips(database, imported)
        await createClip(database, track, { title: 'Neu', position: 20.5 })
        const clips = await track.clips.fetch()
        const clip = clips.find((c) => c.title === 'Neu')!
        expect([clip.position, clip.speed, clip.color]).toEqual([20.5, 1, '#00000000'])
    })
})
