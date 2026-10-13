import { describe, expect, it } from '@jest/globals'
import { supportsVolumeControl } from '../volumeSupport'

describe('supportsVolumeControl', () => {
    it('detects browsers that ignore the volume of media elements (iOS Safari)', () => {
        const ios = { volume: 1 }
        Object.defineProperty(ios, 'volume', { get: () => 1, set: () => undefined })
        expect(supportsVolumeControl(() => ios)).toBe(false)
    })

    it('detects working volume control', () => {
        expect(supportsVolumeControl(() => ({ volume: 1 }))).toBe(true)
    })
})
