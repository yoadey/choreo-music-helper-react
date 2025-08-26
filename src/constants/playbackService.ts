import { getGlobalSpeedOnly, getLeadInDuration, getLeadInVolume, getLeadOutDuration, getLeadOutVolume, getLastTrack, getLoopEnd, getLoopStart, getSpeed, preferences } from '@/store/playbackState';
import { database } from '@/model/index.web';
import Clip from '@/model/clip';
import { Q } from '@nozbe/watermelondb';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import type { Subscription } from 'rxjs';

export const VOLUME_FADE_DURATION = 2000; // 2 seconds

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
        let clipSpeeds: { start: number; end: number; speed: number }[] = [];
        let clipSubscription: Subscription | undefined;

        const loadClipSpeeds = (trackId?: string | null) => {
                clipSubscription?.unsubscribe();
                clipSpeeds = [];
                if (!trackId) return;
                clipSubscription = database
                        .get<Clip>('clips')
                        .query(Q.where('track_id', trackId))
                        .observeWithColumns(['position', 'speed'])
                        .subscribe((clips) => {
                                const sorted = clips.sort((a, b) => a.position - b.position);
                                clipSpeeds = sorted.map((clip, index) => ({
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
		console.log('RemotePlay event received');
		TrackPlayer.play()
	})

	TrackPlayer.addEventListener(Event.RemotePause, () => {
		TrackPlayer.pause()
	})

	TrackPlayer.addEventListener(Event.RemoteStop, () => {
		TrackPlayer.stop()
	})

	TrackPlayer.addEventListener(Event.RemoteNext, () => {
		TrackPlayer.skipToNext()
	})

	TrackPlayer.addEventListener(Event.RemotePrevious, () => {
		TrackPlayer.skipToPrevious()
	})

	const isLoopActive = () => {
		return loopStart !== undefined && loopEnd !== undefined && loopStart < loopEnd;
	}

	const loopChecks = async ({ position }: { position: number }) => {
		const state = await TrackPlayer.getPlaybackState();
		if (state.state === State.Playing) {
                        let clipSpeed = 1;
                        for (const cs of clipSpeeds) {
                                if (position >= cs.start && position < cs.end) {
                                        clipSpeed = cs.speed;
                                        break;
                                }
                        }
                        const rate = globalSpeedOnly ? speed : speed * clipSpeed;
                        TrackPlayer.setRate(rate);
			if (isLoopActive()) {
				checkVolume({ position });
			}
			if (position > loopEnd! + leadOutDuration ||
				position < loopStart! - leadInDuration) {
				TrackPlayer.seekTo(loopStart! - leadInDuration);
			}
		}
	}

	const calcVolume = ({ position, fadeStart, volumeStart, volumeEnd }: { position: number; fadeStart: number; volumeStart: number; volumeEnd: number }) => {
		return (volumeEnd - volumeStart) * (position - fadeStart) / VOLUME_FADE_DURATION + volumeStart;
	}

	const checkVolume = ({ position }: { position: number }) => {
		let volume = 1.0;
		if (isLoopActive()) {
			if (position < loopStart! - leadInDuration + VOLUME_FADE_DURATION / 2) {
				volume = calcVolume({
					position: position,
					fadeStart: loopStart! - leadInDuration - VOLUME_FADE_DURATION / 2,
					volumeStart: leadOutVolume,
					volumeEnd: leadInVolume
				});
			} else if (position < loopStart! - VOLUME_FADE_DURATION) {
				volume = leadInVolume;
			} else if (position < loopStart!) {
				volume = calcVolume({
					position: position,
					fadeStart: loopStart! - VOLUME_FADE_DURATION,
					volumeStart: leadInVolume,
					volumeEnd: 1.0
				});
			} else if (position < loopEnd!) {
				volume = 1.0;
			} else if (position < loopEnd! + VOLUME_FADE_DURATION) {
				volume = calcVolume({
					position: position,
					fadeStart: loopEnd!,
					volumeStart: 1.0,
					volumeEnd: leadOutVolume
				});
			} else if (position < loopEnd! + leadOutDuration - VOLUME_FADE_DURATION / 2) {
				volume = leadOutVolume;
			} else {
				volume = calcVolume({
					position: position,
					fadeStart: loopEnd! + leadOutDuration - VOLUME_FADE_DURATION / 2,
					volumeStart: leadOutVolume,
					volumeEnd: leadInVolume
				});
			}
		}
		TrackPlayer.setVolume(volume);
	}

	TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, loopChecks);
}
