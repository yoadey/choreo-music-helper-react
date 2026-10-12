import { beforeEach, describe, expect, it, jest } from '@jest/globals'

let mockResolvePick: (result: unknown) => void = () => undefined

jest.mock('expo-document-picker', () => ({
    getDocumentAsync: jest.fn(() => new Promise((resolve) => (mockResolvePick = resolve))),
}))
jest.mock('idb-keyval', () => ({ set: jest.fn(async () => undefined), del: jest.fn(async () => undefined) }))
jest.mock('@/model/index.web', () => ({ database: {} }))
jest.mock('@/model/trackRepository', () => ({ createTrackWithClips: jest.fn(async () => ({ id: 'new-track' })) }))
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

describe('importErrorMessage', () => {
    it('reports a full storage', () => {
        const { t } = require('@/i18n') as typeof import('@/i18n')
        expect(importErrorMessage(new DOMException('full', 'QuotaExceededError'))).toBe(t.storageFull)
        expect(importErrorMessage(new Error('decode'))).toBe(t.importFailed)
    })
})
