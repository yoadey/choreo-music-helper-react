import { beforeEach, describe, expect, it, jest } from '@jest/globals'

let mockResolvePick: (result: unknown) => void = () => undefined

jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(() => new Promise((resolve) => (mockResolvePick = resolve))),
}))
jest.mock('idb-keyval', () => ({ set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) }))
jest.mock('@/model/index.web', () => ({
    database: {},
    flushDatabase: jest.fn(async () => undefined),
    withOwnSaveFailureReport: (action: () => Promise<unknown>) => action(),
    markSaveFailureReported: jest.fn(),
}))
jest.mock('@/model/trackRepository', () => ({
    createTrackWithClips: jest.fn(async () => ({ id: 'new-track' })),
    deleteTrack: jest.fn(async () => undefined),
}))
jest.mock('@/helpers/player', () => ({ selectTrack: jest.fn(async () => true) }))
jest.mock('@/helpers/audio', () => ({
    parseAudioMetadata: jest.fn(async () => ({ title: 'Song' })),
    decodeAudio: jest.fn(async () => ({ channelData: new Float32Array(8), duration: 1 })),
    requestPersistentStorage: jest.fn(async () => undefined),
}))

import { importAudioFile, importErrorMessage } from '../importAudio'

const pickedFile = () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'song.mp3', { type: 'audio/mpeg' })
    // jsdom does not implement Blob.arrayBuffer
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(3) })
    return file
}

beforeEach(() => {
    localStorage.clear()
    URL.revokeObjectURL = jest.fn()
})

describe('importAudioFile', () => {
    it('only reports the start of the import after a file was picked', async () => {
        const onStart = jest.fn()
        const importing = importAudioFile(onStart)
        await Promise.resolve()
        // The picker is still open (and may never report a cancel in some browsers)
        expect(onStart).not.toHaveBeenCalled()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await importing
        expect(onStart).toHaveBeenCalledTimes(1)
    })

    it('does not report a start when the picker is cancelled', async () => {
        const onStart = jest.fn()
        const importing = importAudioFile(onStart)
        mockResolvePick({ canceled: true, assets: null })
        await importing
        expect(onStart).not.toHaveBeenCalled()
    })

    it('releases the object URL the picker created for the file', async () => {
        const importing = importAudioFile()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await importing
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picked')
    })

    it('does not wait for the persistent storage permission (Firefox may never answer)', async () => {
        const audio = require('@/helpers/audio') as { requestPersistentStorage: jest.Mock }
        audio.requestPersistentStorage.mockImplementationOnce(() => new Promise(() => undefined))
        const { createTrackWithClips } = require('@/model/trackRepository') as { createTrackWithClips: jest.Mock }
        const importing = importAudioFile()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await importing
        expect(createTrackWithClips).toHaveBeenCalled()
    })
})

describe('importAudioFile when the song cannot be created', () => {
    it('reports the original error, also when removing the stored file fails', async () => {
        const repository = require('@/model/trackRepository') as { createTrackWithClips: jest.Mock }
        repository.createTrackWithClips.mockImplementationOnce(async () => {
            throw new DOMException('full', 'QuotaExceededError')
        })
        const { del } = require('idb-keyval') as { del: jest.Mock }
        del.mockImplementationOnce(async () => {
            throw new Error('transaction aborted')
        })
        const importing = importAudioFile()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await expect(importing).rejects.toMatchObject({ name: 'QuotaExceededError' })
    })
})

describe('importAudioFile and pending files', () => {
    it('marks the stored file as pending until the song is saved', async () => {
        const { getPendingFiles } = require('@/store/pendingFiles') as typeof import('@/store/pendingFiles')
        const { set } = require('idb-keyval') as { set: jest.Mock }
        let pendingWhileStoring: string[] = []
        set.mockImplementationOnce(async () => {
            pendingWhileStoring = getPendingFiles()
        })
        const importing = importAudioFile()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await importing
        expect(pendingWhileStoring).toHaveLength(1)
        expect(getPendingFiles()).toEqual([])
    })
})

describe('importAudioFile when the database cannot be saved', () => {
    it('removes the song and its file again and reports the error (the song would be gone after a reload)', async () => {
        const model = require('@/model/index.web') as { flushDatabase: jest.Mock }
        model.flushDatabase.mockImplementationOnce(async () => {
            throw new DOMException('full', 'QuotaExceededError')
        })
        const repository = require('@/model/trackRepository') as { deleteTrack: jest.Mock }
        const player = require('@/helpers/player') as { selectTrack: jest.Mock }
        player.selectTrack.mockClear()
        const importing = importAudioFile()
        mockResolvePick({ canceled: false, assets: [{ name: 'song.mp3', uri: 'blob:picked', file: pickedFile() }] })
        await expect(importing).rejects.toMatchObject({ name: 'QuotaExceededError' })
        // The import reports it, the background save does not report it again
        expect((require('@/model/index.web') as { markSaveFailureReported: jest.Mock }).markSaveFailureReported).toHaveBeenCalled()
        expect(repository.deleteTrack).toHaveBeenCalledWith(
            expect.anything(),
            { id: 'new-track' },
            expect.any(Function),
            expect.any(Function),
        )
        expect(player.selectTrack).not.toHaveBeenCalled()
    })
})

describe('importErrorMessage', () => {
    it('reports a full storage', () => {
        const { t } = require('@/i18n') as typeof import('@/i18n')
        expect(importErrorMessage(new DOMException('full', 'QuotaExceededError'))).toBe(t.storageFull)
        expect(importErrorMessage(new Error('decode'))).toBe(t.importFailed)
        // LokiJS reports a failed save with the IndexedDB event
        expect(importErrorMessage({ target: { error: new DOMException('full', 'QuotaExceededError') } })).toBe(
            t.storageFull,
        )
    })
})
