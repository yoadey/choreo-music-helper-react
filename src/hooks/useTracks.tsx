import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { useEffect, useState } from 'react'
import type { Subscription } from 'rxjs'

const NO_TRACKS: TrackWithClips[] = []
/** Waits longer after each failed read, up to the maximum */
const RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30_000

/**
 * All tracks, undefined until they are read from the database. Updates when tracks are added, removed or their
 * title/color changes. After a failed read it reads them again (the tracks read before stay until then).
 */
export const useLoadedTracks = () => {
    const [tracks, setTracks] = useState<TrackWithClips[]>()

    useEffect(() => {
        let subscription: Subscription | undefined
        let retry: ReturnType<typeof setTimeout> | undefined
        let delay = RETRY_DELAY
        const subscribe = () => {
            subscription = database
                .get<TrackWithClips>('tracks')
                .query()
                .observeWithColumns(['title', 'color'])
                .subscribe({
                    next: (tracks) => {
                        delay = RETRY_DELAY
                        setTracks(tracks)
                    },
                    error: (error) => {
                        console.warn(`Could not read the songs, trying again in ${delay / 1000}s`, error)
                        retry = setTimeout(subscribe, delay)
                        delay = Math.min(delay * 2, MAX_RETRY_DELAY)
                    },
                })
        }
        subscribe()
        return () => {
            clearTimeout(retry)
            subscription?.unsubscribe()
        }
    }, [])

    return tracks
}

/** All tracks (none until they are read). Updates when tracks are added, removed or their title/color changes. */
export const useTracks = () => useLoadedTracks() ?? NO_TRACKS
