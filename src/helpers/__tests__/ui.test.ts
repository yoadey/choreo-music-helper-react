import { describe, expect, it } from '@jest/globals'
import { clipProgressFraction, formatClipTime, formatSecondsToMinutes, parseDurationInput, stepSeconds } from '../miscellaneous'
import { MAX_SPEED, MIN_SPEED, sliderToSpeed, speedToSlider, stepSpeed } from '../speed'

describe('speed slider mapping', () => {
    it('maps the lower half of the slider to 0.5–1.0 and the upper half to 1.0–2.0', () => {
        expect(sliderToSpeed(0)).toBe(MIN_SPEED)
        expect(sliderToSpeed(0.5)).toBe(0.75)
        expect(sliderToSpeed(1)).toBe(1)
        expect(sliderToSpeed(1.5)).toBe(1.5)
        expect(sliderToSpeed(2)).toBe(MAX_SPEED)
    })

    it('depends only on the slider value, not on the previous speed', () => {
        // Regression: crossing 1.0 used the old speed to choose the mapping and the value jumped
        expect(sliderToSpeed(1.5)).toBe(1.5)
        expect(sliderToSpeed(0.6)).toBe(0.8)
    })

    it('is the inverse of speedToSlider', () => {
        for (const speed of [0.5, 0.63, 0.8, 1, 1.25, 2]) {
            expect(sliderToSpeed(speedToSlider(speed))).toBeCloseTo(speed)
        }
    })

    it('steps and clamps the speed', () => {
        expect(stepSpeed(1, 0.1)).toBe(1.1)
        expect(stepSpeed(0.55, -0.1)).toBe(MIN_SPEED)
        expect(stepSpeed(1.95, 0.1)).toBe(MAX_SPEED)
        expect(stepSpeed(0.7, 0.01)).toBe(0.71)
    })
})

describe('clipProgressFraction', () => {
    it('returns the fraction inside the clip', () => {
        expect(clipProgressFraction(15, 10, 20)).toBeCloseTo(0.5)
    })

    it('returns -1 outside the clip', () => {
        expect(clipProgressFraction(5, 10, 20)).toBe(-1)
        expect(clipProgressFraction(20, 10, 20)).toBe(-1)
    })

    it('does not divide by zero for clips at the same position', () => {
        expect(clipProgressFraction(10, 10, 10)).toBe(-1)
    })
})

describe('parseDurationInput', () => {
    it('allows clearing the field', () => {
        expect(parseDurationInput('')).toBeNull()
    })

    it('parses non-negative numbers', () => {
        expect(parseDurationInput('5')).toBe(5)
        expect(parseDurationInput('2,5')).toBe(2.5)
        expect(parseDurationInput('-3')).toBeNull()
        expect(parseDurationInput('abc')).toBeNull()
    })
})

describe('time formatting', () => {
    it('formats clip positions with tenths', () => {
        expect(formatClipTime(65.34)).toBe('1:05.3')
        expect(formatClipTime(-1)).toBe('0:00.0')
    })

    it('never shows negative or NaN remaining times', () => {
        expect(formatSecondsToMinutes(-0.2)).toBe('00:00')
        expect(formatSecondsToMinutes(Number.NaN)).toBe('00:00')
    })
})

describe('stepSeconds', () => {
    it('avoids floating point noise', () => {
        expect(stepSeconds(2.3, -1)).toBe(1.3)
        let value = 5.3
        for (let i = 0; i < 5; i++) value = stepSeconds(value, -1)
        expect(value).toBe(0.3)
    })

    it('never goes below zero', () => {
        expect(stepSeconds(0.5, -1)).toBe(0)
    })
})
