import { sortByPosition } from '@/helpers/playback'
import Clip from '@/model/clip'
import TrackWithClips from '@/model/track'
import { useEffect, useState } from 'react'

const ALL_COLUMNS = ['title', 'position', 'color', 'speed']
const NO_CLIPS: Clip[] = []

/** Clips of the track sorted by position. Updates when one of the given columns changes. */
export const useSortedClips = (track: TrackWithClips | null | undefined, columns: string[] = ALL_COLUMNS) => {
    const [state, setState] = useState<{ trackId: string; clips: Clip[] }>()
    const columnKey = columns.join(',')

    useEffect(() => {
        if (!track) return
        const subscription = track.clips
            .observeWithColumns(columnKey.split(','))
            .subscribe((result) => setState({ trackId: track.id, clips: sortByPosition(result) }))
        return () => subscription.unsubscribe()
    }, [track, columnKey])

    return track && state?.trackId === track.id ? state.clips : NO_CLIPS
}
