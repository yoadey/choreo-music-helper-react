import { useEffect, useState } from 'react'
import TrackPlayer, { Event } from 'react-native-track-player'

export const useProgressWithRange = ({ start, end }: { start: number, end: number }) => {
    const [progress, setProgress] = useState<number>(-1)

    useEffect(() => {
        function handleProgessChanged({ position }: { position: number }) {
            if (position > start && position < end) {
                setProgress(position);
            }
            else {
                setProgress(-1);
            }
        }
        const progressListener = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, handleProgessChanged);
        const seekListener = TrackPlayer.addEventListener(Event.RemoteSeek, handleProgessChanged)
        return () => {
            progressListener.remove()
            seekListener.remove();
        };
    }, [start, end])

    return progress
}