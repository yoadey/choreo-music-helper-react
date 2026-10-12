import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Subject } from 'rxjs'

const mockRecords = new Subject<unknown>()

jest.mock('@/model/index.web', () => ({
    database: {
        get: () => ({ findAndObserve: () => mockRecords }),
        write: async (fn: () => Promise<void>) => fn(),
    },
}))
jest.mock('idb-keyval', () => ({ get: jest.fn(async () => undefined) }))
jest.mock('@/helpers/audio', () => ({
    decodeAudio: jest.fn(async () => {
        throw new Error('cannot decode')
    }),
}))

describe('useObservedRecord', () => {
    it('returns null when the record is deleted (observable completes)', async () => {
        const { useObservedRecord } = require('../useObservedRecord') as typeof import('../useObservedRecord')
        const { result } = renderHook(() => useObservedRecord('clips', 'clip-1'))
        expect(result.current).toBeUndefined()
        act(() => mockRecords.next({ id: 'clip-1' }))
        expect(result.current).toEqual({ id: 'clip-1' })
        act(() => mockRecords.complete())
        expect(result.current).toBeNull()
    })
})

describe('useWaveform', () => {
    const track = (overrides: object) => ({ id: 't1', uri: '/audio/t1.mp3', waveform: null, update: jest.fn(), ...overrides }) as never

    it('shows an empty waveform instead of loading forever when the audio file is missing', async () => {
        const { useWaveform } = require('../useWaveform') as typeof import('../useWaveform')
        const { result } = renderHook(() => useWaveform(track({})))
        await waitFor(() => expect(result.current).toEqual([]))
    })

    it('shows an empty waveform when the audio cannot be decoded', async () => {
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => new Blob(['broken']))
        const { useWaveform } = require('../useWaveform') as typeof import('../useWaveform')
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        const { result } = renderHook(() => useWaveform(track({ id: 't2' })))
        await waitFor(() => expect(result.current).toEqual([]))
        warn.mockRestore()
    })

    it('does not read and decode the file again after a failure', async () => {
        const { get } = require('idb-keyval') as { get: jest.Mock }
        const { useWaveform } = require('../useWaveform') as typeof import('../useWaveform')
        const first = renderHook(() => useWaveform(track({ id: 't3' })))
        await waitFor(() => expect(first.result.current).toEqual([]))
        const calls = get.mock.calls.length
        first.unmount()
        const second = renderHook(() => useWaveform(track({ id: 't3' })))
        expect(second.result.current).toEqual([])
        expect(get.mock.calls.length).toBe(calls)
    })

    it('uses the stored waveform', () => {
        const { useWaveform } = require('../useWaveform') as typeof import('../useWaveform')
        const { result } = renderHook(() => useWaveform(track({ waveform: '[0.5,0.25]' })))
        expect(result.current).toEqual([0.5, 0.25])
    })
})
