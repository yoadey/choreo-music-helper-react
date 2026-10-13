import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('idb-keyval', () => ({ del: jest.fn(async () => undefined) }))
jest.mock('@/model/index.web', () => ({
    database: {},
    flushDatabase: jest.fn(async () => undefined),
    withOwnSaveFailureReport: (action: () => Promise<unknown>) => action(),
    markSaveFailureReported: jest.fn(),
}))
jest.mock('@/model/trackRepository', () => ({ deleteTrack: jest.fn(async () => undefined) }))
jest.mock('@/helpers/player', () => ({ releaseTrack: jest.fn(async () => undefined) }))

import { removeOrphanedAudioFiles, removeTrack } from '../tracks'
import { getLastTrack, getLoopStartId, setLastTrack, setLoopStart } from '@/store/playbackState'

const track = { id: 't1', uri: '/audio/t1.mp3' } as never
const repository = () => require('@/model/trackRepository') as { deleteTrack: jest.Mock }
const player = () => require('@/helpers/player') as { releaseTrack: jest.Mock }
const model = () => require('@/model/index.web') as { flushDatabase: jest.Mock; markSaveFailureReported: jest.Mock }

beforeEach(() => {
    localStorage.clear()
    repository().deleteTrack.mockClear()
    player().releaseTrack.mockClear()
    model().markSaveFailureReported.mockClear()
})

describe('removeTrack', () => {
    it('releases the song from the player first, then deletes it (written before its file is removed)', async () => {
        await removeTrack(track)
        expect(player().releaseTrack).toHaveBeenCalledWith('t1', { keepPreferences: true })
        expect(repository().deleteTrack).toHaveBeenCalledWith({}, track, expect.any(Function), expect.any(Function))
        expect(player().releaseTrack.mock.invocationCallOrder[0]).toBeLessThan(
            repository().deleteTrack.mock.invocationCallOrder[0],
        )
    })

    it('keeps the loop and the last song when the song could not be deleted', async () => {
        repository().deleteTrack.mockImplementationOnce(async () => {
            throw new Error('writer failed')
        })
        await expect(removeTrack(track)).rejects.toThrow()
        expect(player().releaseTrack).toHaveBeenCalledWith('t1', { keepPreferences: true })
    })

    it('forgets a deleted song that is remembered as last song (e.g. it could not be loaded)', async () => {
        setLastTrack('t1')
        setLoopStart({ id: 'clip-of-t1' })
        await removeTrack(track)
        expect(getLastTrack()).toBeUndefined()
        expect(getLoopStartId()).toBeUndefined()
    })

    it('reports a failed save once (as failed delete)', async () => {
        repository().deleteTrack.mockImplementationOnce(async (...args: unknown[]) => {
            model().flushDatabase.mockImplementationOnce(async () => {
                throw new Error('quota')
            })
            await (args[3] as () => Promise<void>)()
        })
        await expect(removeTrack(track)).rejects.toThrow('quota')
        expect(model().markSaveFailureReported).toHaveBeenCalled()
    })

    it('does not count other failures as reported save failures (later ones are still shown)', async () => {
        repository().deleteTrack.mockImplementationOnce(async () => {
            throw new Error('writer failed')
        })
        await expect(removeTrack(track)).rejects.toThrow('writer failed')
        expect(model().markSaveFailureReported).not.toHaveBeenCalled()
    })
})

describe('removeOrphanedAudioFiles', () => {
    const minute = 60_000
    const startedAt = 100 * minute

    it('removes pending files whose song does not exist (a failed save), only those', async () => {
        const removeFiles = jest.fn(async (_keys: string[]) => undefined)
        const forget = jest.fn()
        await removeOrphanedAudioFiles({
            pending: [`/audio/orphan_${10 * minute}.mp3`, `/audio/kept_${10 * minute}.mp3`],
            trackUris: async () => [`/audio/kept_${10 * minute}.mp3`],
            removeFiles,
            forget,
            startedAt,
        })
        expect(removeFiles).toHaveBeenCalledWith([`/audio/orphan_${10 * minute}.mp3`])
        // Both are done: the song of the kept one exists
        expect(forget).toHaveBeenCalledWith([`/audio/orphan_${10 * minute}.mp3`, `/audio/kept_${10 * minute}.mp3`])
    })

    it('keeps recent pending files (an import may be running in another tab)', async () => {
        const removeFiles = jest.fn(async (_keys: string[]) => undefined)
        const forget = jest.fn()
        await removeOrphanedAudioFiles({
            pending: [`/audio/recent_${95 * minute}.mp3`],
            trackUris: async () => [],
            removeFiles,
            forget,
            startedAt,
        })
        expect(removeFiles).not.toHaveBeenCalled()
        expect(forget).not.toHaveBeenCalled()
    })

    it('also cleans up pending files with old names without timestamp', async () => {
        const removeFiles = jest.fn(async (_keys: string[]) => undefined)
        const forget = jest.fn()
        await removeOrphanedAudioFiles({ pending: ['/audio/Track01'], trackUris: async () => ['/audio/x_1.mp3'], removeFiles, forget, startedAt })
        expect(removeFiles).toHaveBeenCalledWith(['/audio/Track01'])
        expect(forget).toHaveBeenCalledWith(['/audio/Track01'])
    })

    it('never touches files that are not pending (e.g. after the database was reset)', async () => {
        const removeFiles = jest.fn(async (_keys: string[]) => undefined)
        await removeOrphanedAudioFiles({ pending: [], trackUris: async () => [], removeFiles, forget: jest.fn(), startedAt })
        expect(removeFiles).not.toHaveBeenCalled()
    })
})

describe('removeTrack and pending files', () => {
    it('marks the file as pending until it is removed', async () => {
        const { getPendingFiles } = require('@/store/pendingFiles') as typeof import('@/store/pendingFiles')
        let pendingDuringDelete: string[] = []
        repository().deleteTrack.mockImplementationOnce(async (...args: unknown[]) => {
            pendingDuringDelete = getPendingFiles()
            await (args[2] as (key: string) => Promise<void>)('/audio/t1.mp3')
        })
        await removeTrack(track)
        expect(pendingDuringDelete).toEqual(['/audio/t1.mp3'])
        expect(getPendingFiles()).toEqual([])
    })
})
