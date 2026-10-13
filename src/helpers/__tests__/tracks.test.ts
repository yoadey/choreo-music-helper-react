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
        expect(player().releaseTrack).toHaveBeenCalledWith('t1')
        expect(repository().deleteTrack).toHaveBeenCalledWith({}, track, expect.any(Function), expect.any(Function))
        expect(player().releaseTrack.mock.invocationCallOrder[0]).toBeLessThan(
            repository().deleteTrack.mock.invocationCallOrder[0],
        )
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
    it('removes stored files no song refers to, but not recent files (an import may be running, also in another tab)', async () => {
        const minute = 60_000
        const startedAt = 100 * minute
        const removeFiles = jest.fn(async (_keys: string[]) => undefined)
        await removeOrphanedAudioFiles({
            keys: async () => [
                `/audio/kept_${10 * minute}.mp3`,
                `/audio/orphan_${10 * minute}.mp3`,
                `/audio/recent_${95 * minute}.mp3`,
                `/audio/new_${200 * minute}.mp3`,
                'other',
            ],
            trackUris: async () => [`/audio/kept_${10 * minute}.mp3`],
            removeFiles,
            startedAt,
        })
        // In one transaction
        expect(removeFiles).toHaveBeenCalledTimes(1)
        expect(removeFiles).toHaveBeenCalledWith([`/audio/orphan_${10 * minute}.mp3`])
    })
})
