import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { useEffect, useState } from 'react'

/** All tracks. Updates when tracks are added, removed or their title/color changes. */
export const useTracks = () => {
    const [tracks, setTracks] = useState<TrackWithClips[]>([])

    useEffect(() => {
        const subscription = database
            .get<TrackWithClips>('tracks')
            .query()
            .observeWithColumns(['title', 'color'])
            .subscribe(setTracks)
        return () => subscription.unsubscribe()
    }, [])

    return tracks
}
