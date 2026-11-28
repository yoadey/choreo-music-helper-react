import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { useEffect, useState } from 'react'

const NO_TRACKS: TrackWithClips[] = []

/**
 * All tracks, undefined until they are read from the database. Updates when tracks are added, removed or their
 * title/color changes.
 */
export const useLoadedTracks = () => {
    const [tracks, setTracks] = useState<TrackWithClips[]>()

    useEffect(() => {
        const subscription = database
            .get<TrackWithClips>('tracks')
            .query()
            .observeWithColumns(['title', 'color'])
            .subscribe({
                next: setTracks,
                // Shown as no songs rather than loading forever
                error: (error) => {
                    console.warn('Could not read the songs', error)
                    setTracks(NO_TRACKS)
                },
            })
        return () => subscription.unsubscribe()
    }, [])

    return tracks
}

/** All tracks (none until they are read). Updates when tracks are added, removed or their title/color changes. */
export const useTracks = () => useLoadedTracks() ?? NO_TRACKS
