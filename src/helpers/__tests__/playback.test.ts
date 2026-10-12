import { describe, expect, it } from '@jest/globals'
import {
    buildClipRanges,
    calcFade,
    computeSpeedFactor,
    computeVolume,
    getLoopSeekTarget,
    getNextClipTarget,
    getPreviousClipTarget,
    getStopTarget,
    resolveLoop,
    sortByPosition,
    VOLUME_FADE_DURATION,
} from '../playback'

const clips = [
    { id: 'c', position: 20, speed: 0.5 },
    { id: 'a', position: 0, speed: 1 },
    { id: 'b', position: 10, speed: null },
]

describe('sortByPosition', () => {
    it('sorts without mutating the input', () => {
        const input = [...clips]
        const sorted = sortByPosition(input)
        expect(sorted.map((c) => c.id)).toEqual(['a', 'b', 'c'])
        expect(input.map((c) => c.id)).toEqual(['c', 'a', 'b'])
    })
})

describe('buildClipRanges', () => {
    it('uses the next clip as end and the duration for the last clip', () => {
        expect(buildClipRanges(clips, 30)).toEqual([
            { id: 'a', start: 0, end: 10, speed: 1 },
            { id: 'b', start: 10, end: 20, speed: 1 },
            { id: 'c', start: 20, end: 30, speed: 0.5 },
        ])
    })

    it('uses Infinity as end of the last clip while the duration is unknown', () => {
        expect(buildClipRanges(clips, 0)[2].end).toBe(Number.POSITIVE_INFINITY)
    })
})

describe('resolveLoop', () => {
    const ranges = buildClipRanges(clips, 30)

    it('resolves the loop from clip ids', () => {
        expect(resolveLoop('a', 'b', ranges)).toEqual({ start: 0, end: 20 })
        expect(resolveLoop('b', 'b', ranges)).toEqual({ start: 10, end: 20 })
    })

    it('follows edited clip positions instead of stale snapshots', () => {
        const moved = buildClipRanges([...clips, { id: 'd', position: 15, speed: 1 }], 30)
        expect(resolveLoop('a', 'b', moved)).toEqual({ start: 0, end: 15 })
    })

    it('uses the track end for the last clip', () => {
        expect(resolveLoop('c', 'c', ranges)).toEqual({ start: 20, end: 30 })
    })

    it('is inactive when only one marker is set', () => {
        expect(resolveLoop(undefined, 'b', ranges)).toBeUndefined()
        expect(resolveLoop('a', undefined, ranges)).toBeUndefined()
    })

    it('is inactive when a marker references a deleted clip', () => {
        expect(resolveLoop('deleted', 'b', ranges)).toBeUndefined()
    })

    it('is inactive when A lies behind B', () => {
        expect(resolveLoop('c', 'a', ranges)).toBeUndefined()
    })

    it('is inactive when the end of the last clip is not known yet', () => {
        expect(resolveLoop('a', 'c', buildClipRanges(clips, 0))).toBeUndefined()
    })
})

describe('getLoopSeekTarget', () => {
    const loop = { start: 10, end: 20 }

    it('never seeks without an active loop', () => {
        expect(getLoopSeekTarget({ position: 50, loop: undefined, leadIn: 2, leadOut: 2 })).toBeNull()
    })

    it('does not seek inside the loop including lead in and lead out', () => {
        expect(getLoopSeekTarget({ position: 8, loop, leadIn: 2, leadOut: 2 })).toBeNull()
        expect(getLoopSeekTarget({ position: 15, loop, leadIn: 2, leadOut: 2 })).toBeNull()
        expect(getLoopSeekTarget({ position: 22, loop, leadIn: 2, leadOut: 2 })).toBeNull()
    })

    it('jumps back to the lead in after the lead out', () => {
        expect(getLoopSeekTarget({ position: 22.1, loop, leadIn: 2, leadOut: 2 })).toBe(8)
    })

    it('jumps forward to the lead in when before the loop', () => {
        expect(getLoopSeekTarget({ position: 3, loop, leadIn: 2, leadOut: 2 })).toBe(8)
    })

    it('never returns a negative position', () => {
        expect(getLoopSeekTarget({ position: 30, loop: { start: 1, end: 5 }, leadIn: 4, leadOut: 0 })).toBe(0)
        expect(getLoopSeekTarget({ position: 0, loop: { start: 1, end: 5 }, leadIn: 4, leadOut: 0 })).toBeNull()
    })
})

describe('getStopTarget', () => {
    it('returns to the track start without loop', () => {
        expect(getStopTarget(undefined, 4)).toBe(0)
    })

    it('returns to the loop lead in with an active loop', () => {
        expect(getStopTarget({ start: 10, end: 20 }, 4)).toBe(6)
        expect(getStopTarget({ start: 2, end: 20 }, 4)).toBe(0)
    })
})

describe('calcFade', () => {
    it('interpolates linearly', () => {
        expect(calcFade({ position: 5, fadeStart: 4, fadeDuration: 2, startValue: 0, endValue: 1 })).toBeCloseTo(0.5)
        expect(calcFade({ position: 5, fadeEnd: 6, fadeDuration: 2, startValue: 0, endValue: 1 })).toBeCloseTo(0.5)
        expect(calcFade({ position: 3, fadeStart: 4, fadeDuration: 2, startValue: 0, endValue: 1 })).toBe(0)
        expect(calcFade({ position: 7, fadeStart: 4, fadeDuration: 2, startValue: 0, endValue: 1 })).toBe(1)
    })
})

describe('computeVolume', () => {
    const base = { leadIn: 4, leadOut: 6, leadInVolume: 0.2, leadOutVolume: 0.6 }
    const loop = { start: 10, end: 20 }

    it('returns full volume without loop (resets faded volume)', () => {
        expect(computeVolume({ ...base, position: 7, loop: undefined })).toBe(1)
    })

    it('fades between lead out and lead in at the loop start', () => {
        expect(computeVolume({ ...base, loop, position: 6 + VOLUME_FADE_DURATION / 4 })).toBeCloseTo(0.3)
    })

    it('uses the lead in volume during the lead in', () => {
        expect(computeVolume({ ...base, loop, position: 8 })).toBeCloseTo(0.2)
    })

    it('fades between lead in and loop start', () => {
        expect(computeVolume({ ...base, loop, position: 9 })).toBeCloseTo(0.6)
    })

    it('plays the loop at full volume', () => {
        expect(computeVolume({ ...base, loop, position: 15 })).toBe(1)
    })

    it('fades between loop end and lead out', () => {
        expect(computeVolume({ ...base, loop, position: 21 })).toBeCloseTo(0.8)
    })

    it('uses the lead out volume during the lead out', () => {
        expect(computeVolume({ ...base, loop, position: 23 })).toBeCloseTo(0.6)
    })

    it('fades between lead out and lead in at the loop end', () => {
        expect(computeVolume({ ...base, loop, position: 26 - VOLUME_FADE_DURATION / 4 })).toBeCloseTo(0.5)
    })
})

describe('computeVolume continuity', () => {
    const loop = { start: 10, end: 20 }
    const configs = [
        { leadIn: 0, leadOut: 0 },
        { leadIn: 0, leadOut: 4 },
        { leadIn: 2, leadOut: 0 },
        { leadIn: 1.5, leadOut: 1 },
        { leadIn: 0.5, leadOut: 0.5 },
        { leadIn: 4, leadOut: 6 },
    ]

    for (const { leadIn, leadOut } of configs) {
        const base = { loop, leadIn, leadOut, leadInVolume: 0.2, leadOutVolume: 0.6 }
        const first = loop.start - leadIn
        const last = loop.end + leadOut

        it(`has no jumps (lead-in ${leadIn} s, lead-out ${leadOut} s)`, () => {
            // A jump shows up as a large change within a tiny step, a fade (even a short one) does not
            const step = 0.001
            let maxChange = 0
            let previous = computeVolume({ ...base, position: first })
            for (let position = first + step; position <= last; position += step) {
                const volume = computeVolume({ ...base, position })
                maxChange = Math.max(maxChange, Math.abs(volume - previous))
                previous = volume
            }
            expect(maxChange).toBeLessThanOrEqual(0.01)
        })

        it(`continues seamlessly after jumping back (lead-in ${leadIn} s, lead-out ${leadOut} s)`, () => {
            expect(computeVolume({ ...base, position: last })).toBeCloseTo(computeVolume({ ...base, position: first }), 5)
        })
    }

    it('has no jump when the lead-in reaches past the track start (jump target is 0)', () => {
        const base = { loop: { start: 2, end: 20 }, leadIn: 5, leadOut: 0, leadInVolume: 0.2, leadOutVolume: 0.6 }
        // The player jumps from the loop end to max(start - leadIn, 0) = 0
        expect(computeVolume({ ...base, position: 0 })).toBeCloseTo(computeVolume({ ...base, position: 20 }), 5)
        let previous = computeVolume({ ...base, position: 0 })
        for (let position = 0.001; position <= 20; position += 0.001) {
            const volume = computeVolume({ ...base, position })
            expect(Math.abs(volume - previous)).toBeLessThanOrEqual(0.01)
            previous = volume
        }
        expect(computeVolume({ ...base, position: 1 })).toBeCloseTo(0.2, 1)
    })

    it('never applies the lead-in volume inside the loop', () => {
        const base = { loop, leadIn: 0, leadOut: 0, leadInVolume: 0.2, leadOutVolume: 1 }
        for (let position = 10; position <= 20; position += 0.25) {
            expect(computeVolume({ ...base, position })).toBe(1)
        }
    })

    it('reaches full volume at the loop start and keeps it during the loop', () => {
        const base = { loop, leadIn: 2, leadOut: 2, leadInVolume: 0.2, leadOutVolume: 0.4 }
        expect(computeVolume({ ...base, position: 10 })).toBeCloseTo(1)
        expect(computeVolume({ ...base, position: 15 })).toBe(1)
        expect(computeVolume({ ...base, position: 20 })).toBeCloseTo(1)
        expect(computeVolume({ ...base, position: 21.5 })).toBeLessThan(1)
    })
})

describe('computeSpeedFactor', () => {
    const ranges = buildClipRanges(
        [
            { id: 'a', position: 5, speed: 0.5 },
            { id: 'b', position: 10, speed: 1.5 },
        ],
        30,
    )

    it('uses normal speed before the first clip', () => {
        expect(computeSpeedFactor(0, ranges, 2)).toBe(1)
    })

    it('fades into the first clip speed', () => {
        expect(computeSpeedFactor(4, ranges, 2)).toBeCloseTo(0.75)
    })

    it('uses the clip speed inside a clip', () => {
        expect(computeSpeedFactor(6, ranges, 2)).toBeCloseTo(0.5)
        expect(computeSpeedFactor(20, ranges, 2)).toBeCloseTo(1.5)
    })

    it('fades between clip speeds before the next clip', () => {
        expect(computeSpeedFactor(9, ranges, 2)).toBeCloseTo(1)
    })

    it('plays a clip shorter than the fade at its own speed', () => {
        const short = buildClipRanges(
            [
                { id: 'a', position: 0, speed: 1 },
                { id: 'b', position: 10, speed: 0.5 },
                { id: 'c', position: 11, speed: 1.5 },
            ],
            30,
        )
        // The first half of the short clip runs at its own speed
        expect(computeSpeedFactor(10.25, short, 2)).toBeCloseTo(0.5)
        expect(computeSpeedFactor(10.5, short, 2)).toBeCloseTo(0.5)
        expect(computeSpeedFactor(11, short, 2)).toBeCloseTo(1.5)
        // No jumps
        let previous = computeSpeedFactor(0, short, 2)
        for (let position = 0.001; position < 30; position += 0.001) {
            const factor = computeSpeedFactor(position, short, 2)
            expect(Math.abs(factor - previous)).toBeLessThanOrEqual(0.01)
            previous = factor
        }
    })

    it('does not fade towards the clip after the loop end, which the loop never plays', () => {
        const ranges3 = buildClipRanges(
            [
                { id: 'a', position: 0, speed: 1 },
                { id: 'b', position: 10, speed: 0.5 },
                { id: 'c', position: 20, speed: 1 },
            ],
            30,
        )
        const loop = { start: 10, end: 20 }
        expect(computeSpeedFactor(19, ranges3, 2, { loop, leadOut: 0 })).toBeCloseTo(0.5)
        expect(computeSpeedFactor(19.9, ranges3, 2, { loop, leadOut: 0 })).toBeCloseTo(0.5)
        // With a lead-out the next clip is played, so the fade stays
        expect(computeSpeedFactor(19, ranges3, 2, { loop, leadOut: 3 })).toBeCloseTo(0.75)
    })

    it('returns 1 without clips', () => {
        expect(computeSpeedFactor(9, [], 2)).toBe(1)
    })
})

describe('clip navigation', () => {
    const starts = [0, 10, 20]

    it('jumps to the next clip minus lead in', () => {
        expect(getNextClipTarget(5, starts, 0)).toBe(10)
        expect(getNextClipTarget(5, starts, 2)).toBe(8)
    })

    it('treats the lead in of a clip as part of that clip', () => {
        expect(getNextClipTarget(8.5, starts, 2)).toBe(18)
    })

    it('does nothing in the last clip', () => {
        expect(getNextClipTarget(25, starts, 0)).toBeNull()
    })

    it('jumps to the previous clip', () => {
        expect(getPreviousClipTarget(15, starts, 0)).toBe(0)
        expect(getPreviousClipTarget(25, starts, 2)).toBe(8)
    })

    it('restarts the first clip instead of crashing', () => {
        expect(getPreviousClipTarget(5, starts, 2)).toBe(0)
    })

    it('handles positions before the first clip and empty clip lists', () => {
        expect(getNextClipTarget(1, [5, 10], 0)).toBe(5)
        expect(getPreviousClipTarget(1, [5, 10], 0)).toBe(0)
        expect(getNextClipTarget(1, [], 0)).toBeNull()
        expect(getPreviousClipTarget(1, [], 0)).toBe(0)
    })
})
