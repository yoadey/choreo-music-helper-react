import { useState } from 'react'
import { useProgress } from 'react-native-track-player'

export const useProgressWithRange = ({ start, end }: { start: number, end: number }) => {
    const { position } = useProgress(50)
    const [progress, setProgress] = useState<number>(-1)
    
    let newProgress = -1
    if (position > start && position < end) {
        newProgress = position;
    }
    if (newProgress !== progress) {
        setProgress(newProgress);
    }

    return progress
}