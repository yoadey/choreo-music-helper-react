import { createMMKV, useMMKVBoolean, useMMKVNumber, useMMKVObject } from 'react-native-mmkv'

export const preferences = createMMKV({ id: 'preferences-storage' })

/**
 * The last opened track id.
 */
export const KEY_LAST_TRACK = 'lastTrackId'
export const getLastTrack = () => preferences.getString(KEY_LAST_TRACK)
export const setLastTrack = (trackId: string) => preferences.set(KEY_LAST_TRACK, trackId)
export const clearLastTrack = () => preferences.remove(KEY_LAST_TRACK)

/**
 * The current playback speed, should be between 0.5 and 2.0.
 */
export const KEY_SPEED = 'speed'
export const useSpeed = () => useMMKVNumber(KEY_SPEED, preferences)
export const getSpeed = () => preferences.getNumber(KEY_SPEED) ?? 1.0

/**
 * If set to true, only the global speed is applied and clip speeds are ignored.
 */
export const KEY_GLOBAL_SPEED_ONLY = 'globalSpeedOnly'
export const useGlobalSpeedOnly = () => useMMKVBoolean(KEY_GLOBAL_SPEED_ONLY, preferences)
export const getGlobalSpeedOnly = () => preferences.getBoolean(KEY_GLOBAL_SPEED_ONLY) ?? false

/**
 * A loop marker references a clip by id. The positions are resolved from the current clips, so editing,
 * adding or deleting clips never leaves a stale loop behind.
 */
export type LoopMarker = { id: string }

const readMarkerId = (key: string): string | undefined => {
    const json = preferences.getString(key)
    if (json == null) return undefined
    try {
        const id = (JSON.parse(json) as Partial<LoopMarker>).id
        return typeof id === 'string' ? id : undefined
    } catch {
        return undefined
    }
}

const writeMarker = (key: string, marker: LoopMarker | undefined) => {
    if (marker) {
        preferences.set(key, JSON.stringify({ id: marker.id }))
    } else {
        preferences.remove(key)
    }
}

/**
 * The clip at which the loop starts (A).
 */
export const KEY_LOOP_START = 'loopStart'
export const useLoopStart = () => useMMKVObject<LoopMarker>(KEY_LOOP_START, preferences)
export const getLoopStartId = () => readMarkerId(KEY_LOOP_START)
export const setLoopStart = (marker: LoopMarker | undefined) => writeMarker(KEY_LOOP_START, marker)

/**
 * The clip at whose end the loop ends (B).
 */
export const KEY_LOOP_END = 'loopEnd'
export const useLoopEnd = () => useMMKVObject<LoopMarker>(KEY_LOOP_END, preferences)
export const getLoopEndId = () => readMarkerId(KEY_LOOP_END)
export const setLoopEnd = (marker: LoopMarker | undefined) => writeMarker(KEY_LOOP_END, marker)

export const clearLoop = () => {
    setLoopStart(undefined)
    setLoopEnd(undefined)
}

/** Removes loop markers that reference the given clip (e.g. when the clip is deleted). */
export const clearLoopMarkersForClip = (clipId: string) => {
    if (getLoopStartId() === clipId) setLoopStart(undefined)
    if (getLoopEndId() === clipId) setLoopEnd(undefined)
}

/**
 * Defines, how many seconds should be played from the track before the loop start when a loop is activated.
 */
export const KEY_LEAD_IN_DURATION = 'leadInDuration'
export const useLeadInDuration = () => useMMKVNumber(KEY_LEAD_IN_DURATION, preferences)
export const getLeadInDuration = () => preferences.getNumber(KEY_LEAD_IN_DURATION) ?? 0

/**
 * Defines, how many seconds should be played from the track after the loop end when a loop is activated.
 */
export const KEY_LEAD_OUT_DURATION = 'leadOutDuration'
export const useLeadOutDuration = () => useMMKVNumber(KEY_LEAD_OUT_DURATION, preferences)
export const getLeadOutDuration = () => preferences.getNumber(KEY_LEAD_OUT_DURATION) ?? 0

/**
 * Volume of the leadin part if the music is played in a loop.
 */
export const KEY_LEAD_IN_VOLUME = 'leadInVolume'
export const useLeadInVolume = () => useMMKVNumber(KEY_LEAD_IN_VOLUME, preferences)
export const getLeadInVolume = () => preferences.getNumber(KEY_LEAD_IN_VOLUME) ?? 1.0

/**
 * Volume of the leadout part if the music is played in a loop.
 */
export const KEY_LEAD_OUT_VOLUME = 'leadOutVolume'
export const useLeadOutVolume = () => useMMKVNumber(KEY_LEAD_OUT_VOLUME, preferences)
export const getLeadOutVolume = () => preferences.getNumber(KEY_LEAD_OUT_VOLUME) ?? 1.0
