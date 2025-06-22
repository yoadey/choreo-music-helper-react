import { MMKV, Mode, useMMKVNumber } from 'react-native-mmkv';

export const preferences = new MMKV({
    id: `preferences-storage`,
    mode: Mode.MULTI_PROCESS,
    readOnly: false
});

/**
 * The current playback speed, should be between 0.5 and 2.0.
 */
export const KEY_SPEED = 'speed';
export const useSpeed = () => useMMKVNumber(KEY_SPEED, preferences);
export const getSpeed = () => preferences.getNumber(KEY_SPEED) ?? 1.0;

/**
 * The start position of the current loop in ms.
 */
export const KEY_LOOP_START = 'loopStart';
export const useLoopStart = () => useMMKVNumber(KEY_LOOP_START, preferences);
export const getLoopStart = () => preferences.getNumber(KEY_LOOP_START);
/**
 * The end position of the current loop in ms.
 */
export const KEY_LOOP_END = 'loopEnd';
export const useLoopEnd = () => useMMKVNumber(KEY_LOOP_END, preferences);
export const getLoopEnd = () => preferences.getNumber(KEY_LOOP_END);

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