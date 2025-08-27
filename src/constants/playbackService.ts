import Clip from '@/model/clip';
import { database } from '@/model/index.web';
import { getGlobalSpeedOnly, getLastTrack, getLeadInDuration, getLeadInVolume, getLeadOutDuration, getLeadOutVolume, getLoopEnd, getLoopStart, getSpeed, preferences } from '@/store/playbackState';
import { Q } from '@nozbe/watermelondb';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { setRate } from 'react-native-track-player/lib/src/trackPlayer';
import type { Subscription } from 'rxjs';

export const VOLUME_FADE_DURATION = 2; // 2 seconds
export const SPEED_FADE_DURATION = 2; // 2 seconds

export const playbackService = async () => {
    let leadInDuration = 0;
    let leadInVolume = 1;
    let leadOutDuration = 0;
    let leadOutVolume = 1;
    let loopStart: number | undefined = undefined;
    let loopEnd: number | undefined = undefined;
    let speed = 1;
    let globalSpeedOnly = false;
    let playerReady = false;
    let clipsSorted: { start: number; end: number; speed: number }[] = [];
    let clipSubscription: Subscription | undefined;

    const loadClipSpeeds = (trackId?: string | null) => {
        clipSubscription?.unsubscribe();
        clipsSorted = [];
        if (!trackId) return;
        clipSubscription = database
            .get<Clip>('clips')
            .query(Q.where('track_id', trackId))
            .observeWithColumns(['position', 'speed'])
            .subscribe((clipsResult) => {
                const sorted = clipsResult.sort((a, b) => a.position - b.position);
                clipsSorted = sorted.map((clip, index) => ({
                    start: clip.position,
                    end: index < sorted.length - 1 ? sorted[index + 1].position : Number.POSITIVE_INFINITY,
                    speed: clip.speed ?? 1,
                }));
            });
    };

    loadClipSpeeds(getLastTrack());

    // MMKV Listener for settings changes
    preferences.addOnValueChangedListener(() => {
        speed = getSpeed();
        globalSpeedOnly = getGlobalSpeedOnly();
        leadInDuration = getLeadInDuration();
        leadInVolume = getLeadInVolume();
        leadOutDuration = getLeadOutDuration();
        leadOutVolume = getLeadOutVolume();
        loopEnd = getLoopEnd();
        loopStart = getLoopStart();
        loadClipSpeeds(getLastTrack());

        if (playerReady) {
            TrackPlayer.getProgress().then(loopChecks);
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackState, () => {
        playerReady = true;
    })

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play()
    })

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause()
    })

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.stop()
    })

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        const progress = await TrackPlayer.getProgress();
        const leadPosition = progress.position + (leadInDuration ?? 0)
        for (let index = 0; index < clipsSorted.length; index++) {
            const position = clipsSorted[index].start;
            const next = clipsSorted[index + 1].start;
            if (position <= leadPosition && next !== undefined && next > leadPosition) {
                TrackPlayer.seekTo(Math.max(next - leadInDuration, 0));
                break;
            }
        }
    })

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        const progress = await TrackPlayer.getProgress();
        const leadPosition = progress.position + (leadInDuration ?? 0)
        for (let index = 0; index < clipsSorted.length; index++) {
            const position = clipsSorted[index].start;
            const next = clipsSorted[index + 1].start;
            if (position <= leadPosition && (next === undefined || next > leadPosition)) {
                const target = clipsSorted[Math.max(index - 1, 0)].start ?? 0;
                TrackPlayer.seekTo(Math.max(target - leadInDuration, 0));
                break;
            }
        }
    })

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async ({ interval }) => {
        const progress = await TrackPlayer.getProgress();
        const offset = interval ?? 10;
        TrackPlayer.seekTo(Math.max(progress.position - offset, 0));
    })

    TrackPlayer.addEventListener(Event.RemoteJumpForward, async ({ interval }) => {
        const progress = await TrackPlayer.getProgress();
        const offset = interval ?? 10;
        TrackPlayer.seekTo(progress.position + offset);
    })

    const isLoopActive = () => {
        return loopStart !== undefined && loopEnd !== undefined && loopStart < loopEnd;
    }


    const checkSpeed = (position: number) => {
        if (globalSpeedOnly) {
            setRate(speed);
            return;
        }
        let clipSpeedCurrent = 1;
        let clipSpeedNext = 1;
        let positionNext = -1;
        for (const cs of clipsSorted) {
            clipSpeedCurrent = clipSpeedNext
            clipSpeedNext = cs.speed;
            if (position + SPEED_FADE_DURATION >= cs.start && position + SPEED_FADE_DURATION < cs.end) {
                positionNext = cs.start;
                break;
            }
        }
        if (positionNext === -1) {
            TrackPlayer.setRate(speed * clipSpeedNext);
            return;
        }
        const speedFaded = calcFade({
            position: position,
            fadeDuration: SPEED_FADE_DURATION,
            fadeEnd: positionNext,
            startValue: clipSpeedCurrent,
            endValue: clipSpeedNext
        });
        TrackPlayer.setRate(speed * speedFaded);
    }

    const loopChecks = async ({ position }: { position: number }) => {
        const state = await TrackPlayer.getPlaybackState();
        if (state.state === State.Playing) {
            checkSpeed(position);
            if (isLoopActive()) {
                checkVolume(position);
            }
            if (position > loopEnd! + leadOutDuration ||
                position < loopStart! - leadInDuration) {
                TrackPlayer.seekTo(loopStart! - leadInDuration);
            }
        }
    }

    const calcFade = ({
        position,
        fadeStart,
        fadeEnd,
        fadeDuration,
        startValue,
        endValue
    }: {
        position: number;
        fadeStart?: number;
        fadeEnd?: number;
        fadeDuration?: number;
        startValue: number;
        endValue: number
    }) => {
        if (fadeStart != null && fadeEnd != null && fadeDuration == null) {
            fadeDuration = fadeEnd - fadeStart;
        } else if (fadeStart != null && fadeDuration != null && fadeEnd == null) {
            fadeEnd = fadeStart + fadeDuration;
        } else if (fadeEnd != null && fadeDuration != null && fadeStart == null) {
            fadeStart = fadeEnd - fadeDuration;
        }

        if (fadeStart == null || fadeEnd == null || fadeDuration == null) {
            throw new Error("Fade calc failed, missing value!");
        }

        if (position <= fadeStart) return startValue;
        if (position >= fadeEnd) return endValue;

        const progress = (position - fadeStart) / fadeDuration;
        return startValue + progress * (endValue - startValue);
    }

    const checkVolume = (position: number) => {
        let volume = 1.0;
        if (isLoopActive()) {
            if (position < loopStart! - leadInDuration + VOLUME_FADE_DURATION / 2) {
                volume = calcFade({
                    position: position,
                    fadeDuration: VOLUME_FADE_DURATION,
                    fadeEnd: loopStart! - leadInDuration + VOLUME_FADE_DURATION / 2,
                    startValue: leadOutVolume,
                    endValue: leadInVolume
                });
            } else if (position < loopStart!) {
                volume = calcFade({
                    position: position,
                    fadeEnd: loopStart!,
                    fadeDuration: VOLUME_FADE_DURATION,
                    startValue: leadInVolume,
                    endValue: 1.0
                });
            } else if (position < loopEnd! + VOLUME_FADE_DURATION) {
                volume = calcFade({
                    position: position,
                    fadeStart: loopEnd!,
                    fadeDuration: VOLUME_FADE_DURATION,
                    startValue: 1.0,
                    endValue: leadOutVolume
                });
            } else {
                volume = calcFade({
                    position: position,
                    fadeStart: loopEnd! + leadOutDuration - VOLUME_FADE_DURATION / 2,
                    fadeDuration: VOLUME_FADE_DURATION,
                    startValue: leadOutVolume,
                    endValue: leadInVolume
                });
            }
        }
        TrackPlayer.setVolume(volume);
    }

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, loopChecks);
}
