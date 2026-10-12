export const formatSecondsToMinutes = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0
    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)

    const formattedMinutes = String(minutes).padStart(2, '0')
    const formattedSeconds = String(remainingSeconds).padStart(2, '0')

    return `${formattedMinutes}:${formattedSeconds}`
}

/** Formats a clip position (seconds) as m:ss.t */
export const formatClipTime = (position: number) => {
    const safe = Number.isFinite(position) ? Math.max(position, 0) : 0
    const minutes = Math.floor(safe / 60)
    const seconds = Math.floor(safe % 60)
    const tenths = Math.floor((safe * 10) % 10)
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

/** Progress (0–1) of the position inside a clip, -1 if the position is outside of it. */
export const clipProgressFraction = (position: number, start: number, end: number) => {
    if (!(end > start) || position < start || position >= end) return -1
    return (position - start) / (end - start)
}

/** Parses a non-negative number of seconds. Returns null for empty or invalid input. */
export const parseDurationInput = (text: string): number | null => {
    const trimmed = text.trim().replace(',', '.')
    if (trimmed === '' || !/^\d*\.?\d*$/.test(trimmed)) return null
    const value = Number(trimmed)
    return Number.isFinite(value) ? value : null
}
