import { describe, expect, it } from '@jest/globals'
import { createScrubber, displayBarCount, resampleWaveform, secondsPerPixel } from '../scrub'

describe('secondsPerPixel', () => {
    it('matches the displayed waveform (one bar covers duration / bars seconds)', () => {
        // 240 s song, 1000 bars, 6 px per bar → 0.24 s per bar → 0.04 s per pixel
        expect(secondsPerPixel(240, 1000, 6)).toBeCloseTo(0.04)
    })

    it('returns 0 for unknown durations', () => {
        expect(secondsPerPixel(0, 1000, 6)).toBe(0)
        expect(secondsPerPixel(240, 0, 6)).toBe(0)
    })
})

describe('createScrubber', () => {
    it('seeks when scrubbing starts at position 0 and x = 0', () => {
        const scrubber = createScrubber()
        scrubber.begin(0, 0)
        expect(scrubber.move(-100, 0.1, 60)).toBeCloseTo(10)
    })

    it('moves opposite to the finger and clamps to the track', () => {
        const scrubber = createScrubber()
        scrubber.begin(200, 30)
        expect(scrubber.move(300, 0.1, 60)).toBeCloseTo(20)
        expect(scrubber.move(-10000, 0.1, 60)).toBe(60)
        expect(scrubber.move(10000, 0.1, 60)).toBe(0)
    })

    it('ignores moves without an active scrub', () => {
        const scrubber = createScrubber()
        expect(scrubber.move(10, 0.1, 60)).toBeNull()
        scrubber.begin(0, 5)
        scrubber.end()
        expect(scrubber.move(10, 0.1, 60)).toBeNull()
    })
})

describe('displayBarCount', () => {
    it('shows the visible time in the visible bars, independent of the stored resolution', () => {
        // 100 visible bars for 60 s → 0.6 s per bar → a 12 s song has 20 bars
        expect(displayBarCount(12, 100, 60)).toBe(20)
        expect(displayBarCount(300, 100, 60)).toBe(500)
    })

    it('returns 0 for unknown values', () => {
        expect(displayBarCount(0, 100, 60)).toBe(0)
        expect(displayBarCount(12, 0, 60)).toBe(0)
    })
})

describe('resampleWaveform', () => {
    it('keeps the peaks when shrinking', () => {
        expect(resampleWaveform([0.1, 0.9, 0.2, 0.3], 2)).toEqual([0.9, 0.3])
    })

    it('repeats values when stretching', () => {
        expect(resampleWaveform([0.1, 0.5], 4)).toEqual([0.1, 0.1, 0.5, 0.5])
    })

    it('handles empty input', () => {
        expect(resampleWaveform([], 3)).toEqual([0, 0, 0])
        expect(resampleWaveform([1, 2], 0)).toEqual([])
    })
})
