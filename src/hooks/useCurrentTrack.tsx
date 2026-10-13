import { useCurrentTrackStore } from '@/store/store'
import { useEffect, useReducer } from 'react'

/**
 * The current track. Re-renders when the track record changes (e.g. title or color edited).
 * Use selectTrack / unloadCurrentTrack from '@/helpers/player' to change it.
 */
export const useCurrentTrack = () => {
    const currentTrack = useCurrentTrackStore((state) => state.currentTrack)
    const [, forceUpdate] = useReducer((version: number) => version + 1, 0)

    useEffect(() => {
        if (!currentTrack) return
        const subscription = currentTrack.observe().subscribe({
            next: forceUpdate,
            error: () => undefined,
        })
        return () => subscription.unsubscribe()
    }, [currentTrack])

    return { currentTrack }
}
