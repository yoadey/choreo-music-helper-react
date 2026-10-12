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

/**
 * Volume for the given position. Without an active loop the volume is always 1.
 *
 * One loop iteration runs from the jump target (loop start - lead in) to the jump (loop end + lead out):
 * lead in at the lead-in volume, the loop itself at full volume, lead out at the lead-out volume.
 * All transitions are linear fades, shortened if a section is too short, so the volume never jumps.
 * Around the jump back, the end of one iteration and the start of the next one meet in the middle
 * (cross fade), so there is no jump there either.
 */
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
    // The lead in cannot start before the track (the player jumps to max(start - leadIn, 0))
    leadIn = Math.min(leadIn, Math.max(loop.start, 0))
    const loopLength = loop.end - loop.start
    const first = loop.start - leadIn
    const last = loop.end + leadOut

    // Volumes right before the jump (end of the lead out, or loop end) and right after it
    const beforeJump = leadOut > 0 ? leadOutVolume : 1
    const afterJump = leadIn > 0 ? leadInVolume : 1
    // Half cross fade on each side of the jump
    const fadeBeforeJump = leadOut > 0 ? Math.min(VOLUME_FADE_DURATION / 2, leadOut / 2) : 0
    const fadeAfterJump = Math.min(VOLUME_FADE_DURATION / 2, (leadIn > 0 ? leadIn : loopLength) / 2)
    const atJump = fadeBeforeJump === 0 ? beforeJump : (beforeJump + afterJump) / 2
    // Fades between lead in / loop and loop / lead out
    const fadeIntoLoop = leadIn > 0 ? Math.min(VOLUME_FADE_DURATION, leadIn - fadeAfterJump) : 0
    const fadeOutOfLoop = leadOut > 0 ? Math.min(VOLUME_FADE_DURATION, leadOut - fadeBeforeJump) : 0

    const p = Math.min(Math.max(position, first), last)
    const fade = (from: number, to: number, fadeStart: number, duration: number) =>
        duration > 0 ? calcFade({ position: p, fadeStart, fadeDuration: duration, startValue: from, endValue: to }) : to

    if (p < first + fadeAfterJump) return fade(atJump, afterJump, first, fadeAfterJump)
    if (p < loop.start) return fade(leadInVolume, 1, loop.start - fadeIntoLoop, fadeIntoLoop)
    if (p <= loop.end) return 1
    if (p < last - fadeBeforeJump) return fade(1, leadOutVolume, loop.end, fadeOutOfLoop)
    return fade(leadOutVolume, atJump, last - fadeBeforeJump, fadeBeforeJump)
}

/**
 * Speed factor of the clips for the given position. The speed fades into the speed of the next clip
 * during the fade duration before that clip starts. The fade takes at most half of the current clip, so
 * every clip (also one shorter than the fade) is played at its own speed. Before the first clip the
 * speed is 1.
 */
export const computeSpeedFactor = (position: number, ranges: readonly ClipRange[], fadeDuration: number): number => {
    let index = -1
    ranges.forEach((range, i) => {
        if (range.start <= position) index = i
    })
    const currentSpeed = index >= 0 ? ranges[index].speed : 1
    const next = ranges[index + 1]
    if (!next) return currentSpeed
    const sectionStart = index >= 0 ? ranges[index].start : 0
    const sectionLength = next.start - sectionStart
    const fade = Math.min(fadeDuration, index >= 0 ? sectionLength / 2 : sectionLength)
    if (!(fade > 0)) return currentSpeed
    return calcFade({ position, fadeDuration: fade, fadeEnd: next.start, startValue: currentSpeed, endValue: next.speed })
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
