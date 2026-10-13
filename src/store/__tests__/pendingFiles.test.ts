import { describe, expect, it, jest } from '@jest/globals'
import { addPendingFile, getPendingFiles, removePendingFile } from '../pendingFiles'

describe('pending audio files', () => {
    it('remembers files whose import or delete is not finished yet', () => {
        addPendingFile('/audio/a_1.mp3')
        addPendingFile('/audio/b_2.mp3')
        addPendingFile('/audio/a_1.mp3')
        expect(getPendingFiles()).toEqual(['/audio/a_1.mp3', '/audio/b_2.mp3'])
        removePendingFile('/audio/a_1.mp3')
        expect(getPendingFiles()).toEqual(['/audio/b_2.mp3'])
    })
    it('never throws when the storage cannot be written (e.g. full or blocked)', () => {
        const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError')
        })
        expect(() => addPendingFile('/audio/c_3.mp3')).not.toThrow()
        expect(() => removePendingFile('/audio/b_2.mp3')).not.toThrow()
        setItem.mockRestore()
    })
})
