/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals'
import { analyzeAudio, chaptersToClips, computeWaveform, makeUniqueAudioKey, parseStoredWaveform } from '../audioImport'

/** Simulates AudioContext.decodeAudioData, which detaches the passed ArrayBuffer in all browsers. */
const detach = (buffer: ArrayBuffer) => {
    structuredClone(buffer, { transfer: [buffer] })
}

describe('makeUniqueAudioKey', () => {
    it('adds a timestamp before the extension', () => {
        expect(makeUniqueAudioKey('song.mp3', 123)).toBe('/audio/song_123.mp3')
    })

    it('adds a timestamp to names without extension, so files cannot overwrite each other', () => {
        expect(makeUniqueAudioKey('song', 123)).toBe('/audio/song_123')
        expect(makeUniqueAudioKey('song', 123)).not.toBe(makeUniqueAudioKey('song', 124))
    })

    it('encodes special characters', () => {
        expect(makeUniqueAudioKey('ä b.mp3', 1)).toBe(`/audio/${encodeURIComponent('ä b_1.mp3')}`)
    })
})

describe('chaptersToClips', () => {
    it('keeps chapter start positions in seconds (not milliseconds)', () => {
        expect(chaptersToClips([{ title: 'Intro', start: 0 }, { title: 'Refrain', start: 8.5 }], 'Song')).toEqual([
            { title: 'Intro', position: 0, color: '#00000000' },
            { title: 'Refrain', position: 8.5, color: '#00000000' },
        ])
    })

    it('converts MP4 chapter timestamps using their time scale', () => {
        expect(
            chaptersToClips(
                [
                    { title: 'Kapitel 1', start: 0, timeScale: 1000 },
                    { title: 'Kapitel 2', start: 60000, timeScale: 1000 },
                ],
                'Book',
            ).map((c) => c.position),
        ).toEqual([0, 60])
    })

    it('numbers untitled chapters', () => {
        expect(chaptersToClips([{ start: 0 }, { title: '', start: 3 }], 'Song').map((c) => c.title)).toEqual([
            'Clip 1',
            'Clip 2',
        ])
    })

    it('creates a single clip at the start without chapters', () => {
        expect(chaptersToClips(undefined, 'Song')).toEqual([{ title: 'Song', position: 0, color: '#00000000' }])
        expect(chaptersToClips([], 'Song')).toHaveLength(1)
    })
})

describe('computeWaveform', () => {
    it('averages the absolute amplitude per block', () => {
        expect(computeWaveform(new Float32Array([1, -1, 0.5, -0.5]), 2)).toEqual([1, 0.5])
    })

    it('does not produce NaN for very short audio', () => {
        const waveform = computeWaveform(new Float32Array([0.5, -0.5]), 4)
        expect(waveform).toHaveLength(4)
        expect(waveform.every((v) => Number.isFinite(v))).toBe(true)
    })
})

describe('analyzeAudio', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mpeg' })

    it('reads the metadata before decoding, so a detached buffer does not break the import', async () => {
        const calls: string[] = []
        const result = await analyzeAudio(blob, 'song.mp3', {
            now: () => 42,
            parseMetadata: async (b) => {
                calls.push('metadata')
                // Must still be readable
                expect(new Uint8Array(await b.arrayBuffer())).toHaveLength(4)
                return { title: 'Title', chapters: [{ title: 'A', start: 0 }, { title: 'B', start: 2 }] }
            },
            decode: async (buffer) => {
                calls.push('decode')
                detach(buffer)
                return { channelData: new Float32Array([1, 1, 1, 1]), duration: 3.25 }
            },
        })
        expect(calls).toEqual(['metadata', 'decode'])
        expect(result).toEqual({
            key: '/audio/song_42.mp3',
            name: 'song.mp3',
            title: 'Title',
            lengthMs: 3250,
            waveform: expect.any(Array),
            clips: [
                { title: 'A', position: 0, color: '#00000000' },
                { title: 'B', position: 2, color: '#00000000' },
            ],
        })
    })

    it('still imports the file when the metadata cannot be parsed', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        const result = await analyzeAudio(blob, 'song.ogg', {
            now: () => 1,
            parseMetadata: async () => {
                throw new Error('unsupported')
            },
            decode: async () => ({ channelData: new Float32Array(8), duration: 1 }),
        })
        expect(result.title).toBe('song.ogg')
        expect(result.clips).toEqual([{ title: 'song.ogg', position: 0, color: '#00000000' }])
        warn.mockRestore()
    })
})

describe('parseStoredWaveform', () => {
    it('parses a stored waveform', () => {
        expect(parseStoredWaveform('[0.1,0.2]')).toEqual([0.1, 0.2])
    })

    it('returns null for missing, empty or broken data, so the waveform is computed again', () => {
        expect(parseStoredWaveform(null)).toBeNull()
        expect(parseStoredWaveform('')).toBeNull()
        expect(parseStoredWaveform('[]')).toBeNull()
        expect(parseStoredWaveform('{"a":1}')).toBeNull()
        expect(parseStoredWaveform('[1,')).toBeNull()
        expect(parseStoredWaveform('["x"]')).toBeNull()
    })
})
