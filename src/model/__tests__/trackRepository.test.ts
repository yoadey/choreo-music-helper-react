import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import Clip from '../clip'
import schema from '../schema'
import TrackWithClips from '../track'
import { createClip, createTrackWithClips, deleteClip, deleteTrack, readAllTracks, removeTracksById, restoreTracks } from '../trackRepository'

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

    describe('backup', () => {
        it('restores deleted songs with the same ids', async () => {
            const track = await createTrackWithClips(database, imported)
            const backup = await readAllTracks(database)
            await deleteTrack(database, track, async () => undefined)

            await restoreTracks(database, backup)
            expect(await readAllTracks(database)).toEqual(backup)
        })

        it('replaces existing songs and their clips, other songs stay', async () => {
            const track = await createTrackWithClips(database, imported)
            const other = await createTrackWithClips(database, { ...imported, key: '/audio/other_2.mp3', title: 'Other' })
            const [backup] = (await readAllTracks(database)).filter((t) => t.id === track.id)
            const [intro, refrain] = [...backup.clips].sort((a, b) => a.position - b.position)

            // Changed after the backup: renamed, a clip added and one deleted, another file
            await database.write(async () => {
                await track.update((t) => {
                    t.title = 'Renamed'
                    t.uri = '/audio/song_3.mp3'
                })
            })
            await createClip(database, track, { title: 'New', position: 20 })
            await deleteClip(database, (await track.clips.fetch()).find((c) => c.id === refrain.id)!)

            await restoreTracks(database, [backup])
            const restored = (await readAllTracks(database)).find((t) => t.id === track.id)!
            expect(restored.title).toBe('Song')
            expect(restored.uri).toBe('/audio/song_1.mp3')
            expect(restored.clips.map((c) => c.id).sort()).toEqual([intro.id, refrain.id].sort())
            expect((await readAllTracks(database)).find((t) => t.id === other.id)?.title).toBe('Other')
        })

        it('undoes a restore: the previous songs come back, new ones are removed', async () => {
            const track = await createTrackWithClips(database, imported)
            const before = await readAllTracks(database)
            const backup = [
                { ...before[0], title: 'From backup', clips: [] },
                { ...before[0], id: 'new-song', uri: '/audio/new_9.mp3', clips: [{ id: 'new-clip', title: 'A', position: 1, color: '#00000000', speed: 1 }] },
            ]
            await restoreTracks(database, backup)
            expect((await readAllTracks(database)).map((t) => t.title).sort()).toEqual(['From backup', 'Song'])

            await restoreTracks(database, before)
            await removeTracksById(database, ['new-song'])
            expect(await readAllTracks(database)).toEqual(before)
            expect(await database.get('clips').query().fetchCount()).toBe(before[0].clips.length)
            expect(track.title).toBe('Song')
        })
    })
})
