import { useEffect, useState } from 'react';
import TrackPlayer, { useIsPlaying } from 'react-native-track-player';
import { useCurrentTrack } from './useCurrentTrack';
import Clip from '@/model/clip';
import { useLeadInDuration } from '@/store/playbackState';
import logo from '@/assets/logo192.png';

export const useMediaSession = () => {
    const { currentTrack } = useCurrentTrack();
    const [clips, setClips] = useState<Clip[]>([]);
    const [leadInDuration] = useLeadInDuration();
    const { playing } = useIsPlaying();

    useEffect(() => {
        if (!currentTrack) {
            setClips([]);
            return;
        }
        const subscription = currentTrack.clips
            .observeWithColumns(['position'])
            .subscribe((c) => {
                const sorted = c.sort((a, b) => a.position - b.position);
                setClips(sorted);
            });
        return () => subscription.unsubscribe();
    }, [currentTrack]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        if (currentTrack) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack.title,
                artwork: [
                    {
                        src: (logo as unknown as string),
                        sizes: '192x192',
                        type: 'image/png',
                    },
                ],
            });
        }

        const handlePlay = () => TrackPlayer.play();
        const handlePause = () => TrackPlayer.pause();
        const handlePrevious = async () => {
            const progress = await TrackPlayer.getProgress();
            for (let index = 0; index < clips.length; index++) {
                const clip = clips[index];
                const nextClip = clips[index + 1];
                if (clip.position <= progress.position && (!nextClip || nextClip.position > progress.position)) {
                    const target = clips[Math.max(index - 1, 0)]?.position ?? 0;
                    TrackPlayer.seekTo(Math.max(target - (leadInDuration ?? 0), 0));
                    break;
                }
            }
        };
        const handleNext = async () => {
            const progress = await TrackPlayer.getProgress();
            for (let index = 0; index < clips.length; index++) {
                const clip = clips[index];
                const nextClip = clips[index + 1];
                if (clip.position <= progress.position && nextClip && nextClip.position > progress.position) {
                    TrackPlayer.seekTo(Math.max(nextClip.position - (leadInDuration ?? 0), 0));
                    break;
                }
            }
        };
        const handleSeekBackward = async (details?: MediaSessionActionDetails) => {
            const progress = await TrackPlayer.getProgress();
            const offset = details?.seekOffset ?? 10;
            TrackPlayer.seekTo(Math.max(progress.position - offset, 0));
        };
        const handleSeekForward = async (details?: MediaSessionActionDetails) => {
            const progress = await TrackPlayer.getProgress();
            const offset = details?.seekOffset ?? 10;
            TrackPlayer.seekTo(progress.position + offset);
        };

        navigator.mediaSession.setActionHandler('play', handlePlay);
        navigator.mediaSession.setActionHandler('pause', handlePause);
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
        navigator.mediaSession.setActionHandler('nexttrack', handleNext);
        navigator.mediaSession.setActionHandler('seekbackward', handleSeekBackward);
        navigator.mediaSession.setActionHandler('seekforward', handleSeekForward);

        return () => {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
            navigator.mediaSession.setActionHandler('seekbackward', null);
            navigator.mediaSession.setActionHandler('seekforward', null);
        };
    }, [currentTrack, clips, leadInDuration]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }, [playing]);
};

export default useMediaSession;
