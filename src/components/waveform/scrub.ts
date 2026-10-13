/** Seconds represented by one pixel of the waveform: each bar covers duration / bars seconds. */
export const secondsPerPixel = (duration: number, waveformLength: number, barTotal: number) => {
    if (!duration || !waveformLength || !barTotal) return 0
    return duration / waveformLength / barTotal
}

/** Tracks a scrub gesture. Dragging to the left moves forward in the track. */
export const createScrubber = () => {
    let start: { x: number; progress: number } | null = null
    return {
        begin(x: number, progress: number) {
            start = { x, progress }
        },
        /** Returns the new position or null if no scrub is active. */
        move(x: number, secPerPixel: number, duration: number): number | null {
            if (start === null) return null
            const target = start.progress + (start.x - x) * secPerPixel
            return Math.min(Math.max(target, 0), duration)
        },
        end() {
            start = null
        },
    }
}

/** Number of bars for the whole track, so that `visibleBars` bars show `visibleTime` seconds. */
export const displayBarCount = (duration: number, visibleBars: number, visibleTime: number) => {
    if (!(duration > 0) || !(visibleBars > 0) || !(visibleTime > 0)) return 0
    return Math.max(1, Math.round((duration * visibleBars) / visibleTime))
}

/** Resamples the stored waveform to the given number of bars (keeping the peaks when shrinking). */
export const resampleWaveform = (waveform: readonly number[], length: number): number[] => {
    if (length <= 0) return []
    if (waveform.length === 0) return new Array(length).fill(0)
    return Array.from({ length }, (_, i) => {
        const from = Math.floor((i * waveform.length) / length)
        const to = Math.max(Math.floor(((i + 1) * waveform.length) / length), from + 1)
        let peak = 0
        for (let j = from; j < to && j < waveform.length; j++) peak = Math.max(peak, waveform[j])
        return peak
    })
}
