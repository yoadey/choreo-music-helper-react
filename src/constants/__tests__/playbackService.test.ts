import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/store/playbackState', () => ({
    getLeadInTime: jest.fn(() => 4_000),
    getLeadInVolume: jest.fn(() => 0.2),
    getLeadOutTime: jest.fn(() => 6_000),
    getLeadOutVolume: jest.fn(() => 0.6),
    getLoopEnd: jest.fn(() => 20_000),
    getLoopStart: jest.fn(() => 10_000),
    getSpeed: jest.fn(() => 1.0),
    KEY_LEAD_IN_TIME: 'leadInTime',
    KEY_LEAD_IN_VOLUME: 'leadInVolume',
    KEY_LEAD_OUT_TIME: 'leadOutTime',
    KEY_LEAD_OUT_VOLUME: 'leadOutVolume',
    KEY_LOOP_END: 'loopEnd',
    KEY_LOOP_START: 'loopStart',
    KEY_SPEED: 'speed',
    preferences: {
        addOnValueChangedListener: jest.fn(),
    },
}))

jest.mock('react-native-track-player', () => ({
    setVolume: jest.fn(),
    setRate: jest.fn(),
    getPlaybackState: jest.fn(),
    seekTo: jest.fn(),
    addEventListener: jest.fn(),
    getProgress: jest.fn(() => Promise.resolve({ position: 0, duration: 100 })),
    State: { Playing: 'playing' },
    Event: {},
}))

import { preferences } from '@/store/playbackState';
import TrackPlayer, { State } from 'react-native-track-player';
import * as playbackServiceModule from '../playbackService';

const VOLUME_FADE_DURATION = playbackServiceModule.VOLUME_FADE_DURATION

describe.skip('playbackService checkVolume', () => {
    let originalLeadInVolume: number
    let originalLeadOutVolume: number
    let originalLoopStart: number
    let originalLoopEnd: number
    let originalLeadInTime: number
    let originalLeadOutTime: number

    let capturedListener: (key: string) => void;

    beforeEach(() => {
        jest.spyOn(preferences, 'addOnValueChangedListener').mockImplementation((onValueChanged) => {
            capturedListener = onValueChanged;
            return {
                remove: () => { },
            };
        });

        (TrackPlayer.getPlaybackState as jest.MockedFunction<typeof TrackPlayer.getPlaybackState>).mockResolvedValue({
            state: State.Playing,
        });

        // Set up test values
        originalLeadInVolume = 0.2
        originalLeadOutVolume = 0.6
        originalLoopStart = 10_000 // 10 seconds
        originalLoopEnd = 20_000 // 20 seconds
        originalLeadInTime = 4_000 // 4 seconds
        originalLeadOutTime = 6_000 // 6 seconds
        
        playbackServiceModule.playbackService();
    })

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    })

    const checkVolumeAtPosition = async (position: number, volume: number) => {
        (TrackPlayer.getProgress as jest.MockedFunction<typeof TrackPlayer.getProgress>).mockResolvedValue({ position, duration: 100, buffered: 0 });
        await capturedListener('speed');
        await Promise.resolve();
        const volumeArg = (TrackPlayer.setVolume as jest.Mock).mock.calls[0][0];
        expect(volumeArg).toBeCloseTo(volume, 3);
    }

    it('should fade between lead out and lead in at loop start', async () => {
        const pos = originalLoopStart - originalLeadInTime + VOLUME_FADE_DURATION / 4;
        await checkVolumeAtPosition(pos, 0.3);
    })

    it('should set lead in', async () => {
        const pos = originalLoopStart - originalLeadInTime / 2;
        await checkVolumeAtPosition(pos, originalLeadInVolume);
    })

    it('should fade between lead in and loop start', async () => {
        const pos = originalLoopStart - VOLUME_FADE_DURATION / 2;
        await checkVolumeAtPosition(pos, 0.6);
    })

    it('should set volume to 1.0 in main', async () => {
        await checkVolumeAtPosition(15_000, 1.0);
    })

    it('should fade between loop end and lead out',async () => {
        const pos = originalLoopEnd + VOLUME_FADE_DURATION / 2;
        await checkVolumeAtPosition(pos, 0.8);
    })

    it('should set lead out', async () => {
        const pos = originalLoopEnd + originalLeadOutTime / 2;
        await checkVolumeAtPosition(pos, originalLeadOutVolume);
    })

    it('should fade between loop end and lead in at loop end', async () => {
        const pos = originalLoopEnd + originalLeadOutTime - VOLUME_FADE_DURATION / 4;
        await checkVolumeAtPosition(pos, 0.5);
    })
})