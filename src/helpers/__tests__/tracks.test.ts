import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('idb-keyval', () => ({ del: jest.fn(async () => undefined) }))
jest.mock('@/model/index.web', () => ({ database: {}, flushDatabase: jest.fn(async () => undefined) }))
jest.mock('@/model/trackRepository', () => ({ deleteTrack: jest.fn(async () => undefined) }))
jest.mock('@/helpers/player', () => ({ releaseTrack: jest.fn(async () => undefined) }))

import { removeTrack } from '../tracks'

const track = { id: 't1', uri: '/audio/t1.mp3' } as never
const repository = () => require('@/model/trackRepository') as { deleteTrack: jest.Mock }
const player = () => require('@/helpers/player') as { releaseTrack: jest.Mock }

beforeEach(() => {
    repository().deleteTrack.mockClear()
    player().releaseTrack.mockClear()
})

describe('removeTrack', () => {
    it('deletes the song (written to the database before its file is removed), then releases it', async () => {
        await removeTrack(track)
        const { flushDatabase } = require('@/model/index.web') as { flushDatabase: jest.Mock }
        expect(repository().deleteTrack).toHaveBeenCalledWith({}, track, expect.any(Function), flushDatabase)
        expect(player().releaseTrack).toHaveBeenCalledWith('t1')
    })

    it('keeps the song loaded (and its loop) when it could not be deleted', async () => {
        repository().deleteTrack.mockImplementationOnce(async () => {
            throw new Error('quota')
        })
        await expect(removeTrack(track)).rejects.toThrow('quota')
        expect(player().releaseTrack).not.toHaveBeenCalled()
    })
})
