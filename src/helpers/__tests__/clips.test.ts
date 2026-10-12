import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/model/index.web', () => ({ database: {} }))
jest.mock('@/model/trackRepository', () => ({ deleteClip: jest.fn(async () => undefined) }))

import { removeClip } from '../clips'
import { getLoopEndId, getLoopStartId, setLoopEnd, setLoopStart } from '@/store/playbackState'

const clip = { id: 'c1' } as never

beforeEach(() => {
    localStorage.clear()
    setLoopStart({ id: 'c1' })
    setLoopEnd({ id: 'c1' })
})

describe('removeClip', () => {
    it('deletes the clip and its loop markers', async () => {
        await removeClip(clip)
        expect(getLoopStartId()).toBeUndefined()
        expect(getLoopEndId()).toBeUndefined()
    })

    it('keeps the loop markers when the clip could not be deleted', async () => {
        const { deleteClip } = require('@/model/trackRepository') as { deleteClip: jest.Mock }
        deleteClip.mockImplementationOnce(async () => {
            throw new Error('quota')
        })
        await expect(removeClip(clip)).rejects.toThrow('quota')
        expect(getLoopStartId()).toBe('c1')
    })
})
