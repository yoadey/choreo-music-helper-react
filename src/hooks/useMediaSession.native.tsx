import { useEffect } from 'react';
import TrackPlayer from 'react-native-track-player';
import { useCurrentTrack } from './useCurrentTrack';
import logo from '@/assets/logo192.png';

export const useMediaSession = () => {
    const { currentTrack } = useCurrentTrack();

    useEffect(() => {
        if (!currentTrack) return;
        TrackPlayer.updateMetadataForTrack(0, {
            title: currentTrack.title,
            artwork: logo as any,
        }).catch(() => {
            // ignore
        });
    }, [currentTrack]);
};

export default useMediaSession;
