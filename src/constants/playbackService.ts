import { getLeadInDuration, getLeadInVolume, getLeadOutDuration, getLeadOutVolume, getLoopEnd, getLoopStart, getSpeed, KEY_LEAD_IN_DURATION, KEY_LEAD_IN_VOLUME, KEY_LEAD_OUT_DURATION, KEY_LEAD_OUT_VOLUME, KEY_LOOP_END, KEY_LOOP_START, KEY_SPEED, preferences } from '@/store/playbackState';
import TrackPlayer, { Event, State } from 'react-native-track-player';

export const VOLUME_FADE_DURATION = 2000; // 2 seconds

export const playbackService = async () => {
	let leadInDuration = getLeadInDuration();
	let leadInVolume = getLeadInVolume();
	let leadOutDuration = getLeadOutDuration();
	let leadOutVolume = getLeadOutVolume();
	let loopStart = getLoopStart();
	let loopEnd = getLoopEnd();
	let speed = getSpeed();

	// MMKV Listener for speed changes
	preferences.addOnValueChangedListener((key) => {
		if (key === KEY_SPEED) {
			speed = getSpeed();
		}
		else if (key === KEY_LEAD_IN_DURATION) {
			leadInDuration = getLeadInDuration();
		}
		else if (key === KEY_LEAD_IN_VOLUME) {
			leadInVolume = getLeadInVolume();
		}
		else if (key === KEY_LEAD_OUT_DURATION) {
			leadOutDuration = getLeadOutDuration();
		}
		else if (key === KEY_LEAD_OUT_VOLUME) {
			leadOutVolume = getLeadOutVolume();
		}
		else if (key === KEY_LOOP_END) {
			loopEnd = getLoopEnd();
		}
		else if (key === KEY_LOOP_START) {
			loopStart = getLoopStart();
		}

		TrackPlayer.getProgress().then(loopChecks);
	});

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
			TrackPlayer.setRate(speed);
			//const { loopStart, loopEnd } = getLoopConfig();
			if (isLoopActive()) {
				checkVolume({ position });
			}
			if (position > loopEnd! + leadOutDuration) {
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
