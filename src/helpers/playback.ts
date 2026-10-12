/**
 * Pure playback calculations. All positions and durations are in seconds.
 */

export const VOLUME_FADE_DURATION = 2
export const SPEED_FADE_DURATION = 2

/** Tolerance for comparing player positions, which are never exact after a seek. */
const POSITION_TOLERANCE = 0.05

export type ClipLike = { id: string; position: number; speed?: number | null }

export type ClipRange = { id: string; start: number; end: number; speed: number }

export type LoopRange = { start: number; end: number }

export const sortByPosition = <T extends { position: number }>(clips: readonly T[]): T[] =>
    [...clips].sort((a, b) => a.position - b.position)

/**
 * Converts clips into time ranges. A clip ends where the next one starts, the last clip ends with the track.
 * While the duration is unknown (0), the last clip ends at Infinity.
 */
export const buildClipRanges = (clips: readonly ClipLike[], duration: number): ClipRange[] => {
    const sorted = sortByPosition(clips)
    return sorted.map((clip, index) => ({
        id: clip.id,
        start: clip.position,
        end: index < sorted.length - 1
            ? sorted[index + 1].position
            : duration > 0 ? duration : Number.POSITIVE_INFINITY,
        speed: clip.speed ?? 1,
    }))
}

/**
 * Resolves the loop from the ids of the start (A) and end (B) clip.
 * Returns undefined if the loop is incomplete, references a deleted clip or is empty/inverted.
 */
export const resolveLoop = (
    startId: string | undefined,
    endId: string | undefined,
    ranges: readonly ClipRange[],
): LoopRange | undefined => {
    if (!startId || !endId) return undefined
    const startClip = ranges.find((r) => r.id === startId)
    const endClip = ranges.find((r) => r.id === endId)
    if (!startClip || !endClip) return undefined
    const loop = { start: startClip.start, end: endClip.end }
    if (!Number.isFinite(loop.end) || loop.start >= loop.end) return undefined
    return loop
}

/** Returns the position to seek to, if the position left the loop (including lead in/out), otherwise null. */
export const getLoopSeekTarget = ({
    position,
    loop,
    leadIn,
    leadOut,
}: {
    position: number
    loop: LoopRange | undefined
    leadIn: number
    leadOut: number
}): number | null => {
    if (!loop) return null
    const target = Math.max(loop.start - leadIn, 0)
    if (position > loop.end + leadOut || position < target - POSITION_TOLERANCE) {
        return target
    }
    return null
}

/** Position the player should return to when stopped. */
export const getStopTarget = (loop: LoopRange | undefined, leadIn: number): number =>
    loop ? Math.max(loop.start - leadIn, 0) : 0

export const calcFade = ({
    position,
    fadeStart,
    fadeEnd,
    fadeDuration,
    startValue,
    endValue,
}: {
    position: number
    fadeStart?: number
    fadeEnd?: number
    fadeDuration?: number
    startValue: number
    endValue: number
}): number => {
    if (fadeStart != null && fadeEnd != null && fadeDuration == null) {
        fadeDuration = fadeEnd - fadeStart
    } else if (fadeStart != null && fadeDuration != null && fadeEnd == null) {
        fadeEnd = fadeStart + fadeDuration
    } else if (fadeEnd != null && fadeDuration != null && fadeStart == null) {
        fadeStart = fadeEnd - fadeDuration
    }

    if (fadeStart == null || fadeEnd == null || fadeDuration == null) {
        throw new Error('Fade calc failed, missing value!')
    }

    if (position <= fadeStart) return startValue
    if (position >= fadeEnd) return endValue

    const progress = (position - fadeStart) / fadeDuration
    return startValue + progress * (endValue - startValue)
}

/** Volume for the given position. Without an active loop the volume is always 1. */
export const computeVolume = ({
    position,
    loop,
    leadIn,
    leadOut,
    leadInVolume,
    leadOutVolume,
}: {
    position: number
    loop: LoopRange | undefined
    leadIn: number
    leadOut: number
    leadInVolume: number
    leadOutVolume: number
}): number => {
    if (!loop) return 1
    if (position < loop.start - leadIn + VOLUME_FADE_DURATION / 2) {
        return calcFade({
            position,
            fadeDuration: VOLUME_FADE_DURATION,
            fadeEnd: loop.start - leadIn + VOLUME_FADE_DURATION / 2,
            startValue: leadOutVolume,
            endValue: leadInVolume,
        })
    }
    if (position < loop.start) {
        return calcFade({
            position,
            fadeEnd: loop.start,
            fadeDuration: VOLUME_FADE_DURATION,
            startValue: leadInVolume,
            endValue: 1,
        })
    }
    if (position < loop.end + VOLUME_FADE_DURATION) {
        return calcFade({
            position,
            fadeStart: loop.end,
            fadeDuration: VOLUME_FADE_DURATION,
            startValue: 1,
            endValue: leadOutVolume,
        })
    }
    return calcFade({
        position,
        fadeStart: loop.end + leadOut - VOLUME_FADE_DURATION / 2,
        fadeDuration: VOLUME_FADE_DURATION,
        startValue: leadOutVolume,
        endValue: leadInVolume,
    })
}

/**
 * Speed factor of the clips for the given position. The speed fades into the speed of the next clip
 * during the fade duration before that clip starts. Before the first clip the speed is 1.
 */
export const computeSpeedFactor = (position: number, ranges: readonly ClipRange[], fadeDuration: number): number => {
    const lookAhead = position + fadeDuration
    const index = ranges.findIndex((r) => lookAhead >= r.start && lookAhead < r.end)
    if (index === -1) {
        // Either before the first clip or (with unknown duration) nothing matches
        const last = ranges[ranges.length - 1]
        return last && lookAhead >= last.end ? last.speed : 1
    }
    const previousSpeed = index > 0 ? ranges[index - 1].speed : 1
    return calcFade({
        position,
        fadeDuration,
        fadeEnd: ranges[index].start,
        startValue: previousSpeed,
        endValue: ranges[index].speed,
    })
}

/** Index of the clip containing the position, -1 if before the first clip. */
const findClipIndex = (position: number, starts: readonly number[]): number => {
    let found = -1
    starts.forEach((start, index) => {
        if (start <= position + POSITION_TOLERANCE) found = index
    })
    return found
}

/**
 * Target position for "next clip". The lead in before a clip counts as part of that clip.
 * Returns null in the last clip.
 */
export const getNextClipTarget = (position: number, starts: readonly number[], leadIn: number): number | null => {
    const sorted = [...starts].sort((a, b) => a - b)
    const next = sorted[findClipIndex(position + leadIn, sorted) + 1]
    return next === undefined ? null : Math.max(next - leadIn, 0)
}

/** Target position for "previous clip". In the first clip (or before it) it returns to the first clip / start. */
export const getPreviousClipTarget = (position: number, starts: readonly number[], leadIn: number): number => {
    const sorted = [...starts].sort((a, b) => a - b)
    const index = findClipIndex(position + leadIn, sorted)
    if (index <= 0) return Math.max((index === 0 ? sorted[0] : 0) - leadIn, 0)
    return Math.max(sorted[index - 1] - leadIn, 0)
}
