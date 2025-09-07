import { MMKV, Mode, useMMKVBoolean, useMMKVNumber, useMMKVObject } from 'react-native-mmkv';

export const preferences = new MMKV({
    id: `preferences-storage`,
    mode: Mode.MULTI_PROCESS,
    readOnly: false
});

/**
 * The last opened track id.
 */
export const KEY_LAST_TRACK = 'lastTrackId';
export const useLastTrack = () => useMMKVNumber(KEY_LAST_TRACK, preferences);
export const getLastTrack = () => preferences.getString(KEY_LAST_TRACK);
export const setLastTrack = (trackId: string) => preferences.set(KEY_LAST_TRACK, trackId)

/**
 * The current playback speed, should be between 0.5 and 2.0.
 */
export const KEY_SPEED = 'speed';
export const useSpeed = () => useMMKVNumber(KEY_SPEED, preferences);
export const getSpeed = () => preferences.getNumber(KEY_SPEED) ?? 1.0;

/**
 * If set to true, only the global speed is applied and clip speeds are ignored.
 */
export const KEY_GLOBAL_SPEED_ONLY = 'globalSpeedOnly';
export const useGlobalSpeedOnly = () => useMMKVBoolean(KEY_GLOBAL_SPEED_ONLY, preferences);
export const getGlobalSpeedOnly = () => preferences.getBoolean(KEY_GLOBAL_SPEED_ONLY) ?? false;

export type ClipPosition = {
    id: string
    position: number
}

/**
 * The start position of the current loop in ms.
 */
export const KEY_LOOP_START = 'loopStart';
export const useLoopStart = () => useMMKVObject<ClipPosition>(KEY_LOOP_START, preferences);
export const getLoopStart = () => {
    const json = preferences.getString(KEY_LOOP_START);
    if (json == null) return undefined;
    return (JSON.parse(json) as ClipPosition).position;
}
/**
 * The end position of the current loop in ms.
 */
export const KEY_LOOP_END = 'loopEnd';
export const useLoopEnd = () => useMMKVObject<ClipPosition>(KEY_LOOP_END, preferences);
export const getLoopEnd = () => {
    const json = preferences.getString(KEY_LOOP_END);
    if (json == null) return undefined;
    return (JSON.parse(json) as ClipPosition).position;
}

/**
 * Defines, how much time in ms should be played from the track before the loop start track when a loop is activated.
 */
export const KEY_LEAD_IN_DURATION = 'leadInDuration';
export const useLeadInDuration = () => useMMKVNumber(KEY_LEAD_IN_DURATION, preferences);
export const getLeadInDuration = () => preferences.getNumber(KEY_LEAD_IN_DURATION) ?? 0;

/**
 * Defines, how much time in ms should be played from the track after the loop end track when a loop is activated.
 */
export const KEY_LEAD_OUT_DURATION = 'leadOutDuration';
export const useLeadOutDuration = () => useMMKVNumber(KEY_LEAD_OUT_DURATION, preferences);
export const getLeadOutDuration = () => preferences.getNumber(KEY_LEAD_OUT_DURATION) ?? 0;

/**
 * Volume of the leadin part if the music is played in a loop.
 */
export const KEY_LEAD_IN_VOLUME = 'leadInVolume';
export const useLeadInVolume = () => useMMKVNumber(KEY_LEAD_IN_VOLUME, preferences);
export const getLeadInVolume = () => preferences.getNumber(KEY_LEAD_IN_VOLUME) ?? 1.0;

/**
 * Volume of the leadout part if the music is played in a loop.
 */
export const KEY_LEAD_OUT_VOLUME = 'leadOutVolume';
export const useLeadOutVolume = () => useMMKVNumber(KEY_LEAD_OUT_VOLUME, preferences);
export const getLeadOutVolume = () => preferences.getNumber(KEY_LEAD_OUT_VOLUME) ?? 1.0;

/**
 * Duration of the volume fade in seconds.
 */
export const KEY_VOLUME_FADE_DURATION = 'volumeFadeDuration';
export const useVolumeFadeDuration = () => useMMKVNumber(KEY_VOLUME_FADE_DURATION, preferences);
export const getVolumeFadeDuration = () => preferences.getNumber(KEY_VOLUME_FADE_DURATION) ?? 2;

/**
 * Duration of the speed fade in seconds.
 */
export const KEY_SPEED_FADE_DURATION = 'speedFadeDuration';
export const useSpeedFadeDuration = () => useMMKVNumber(KEY_SPEED_FADE_DURATION, preferences);
export const getSpeedFadeDuration = () => preferences.getNumber(KEY_SPEED_FADE_DURATION) ?? 2;
