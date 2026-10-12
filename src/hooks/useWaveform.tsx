import { decodeAudio } from '@/helpers/audio'
import { analyzeWaveform, parseStoredWaveform } from '@/helpers/audioImport'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { get } from 'idb-keyval'
import { useEffect, useMemo, useState } from 'react'

// Tracks whose waveform could not be computed: not retried during this session (a failing decode
// of a large file costs a lot of memory and time)
const failedTracks = new Set<string>()
const NO_WAVEFORM: number[] = []
// Running computations, so a track that is selected again meanwhile is not decoded a second time
const pending = new Map<string, Promise<number[]>>()

/** Computes the waveform from the stored audio file and saves it with the track. */
const computeAndStore = async (track: TrackWithClips) => {
    const blob = await get<Blob>(track.uri)
    if (!blob) throw new Error(`Audio file not found: ${track.uri}`)
    const { waveform, lengthMs } = await analyzeWaveform(await blob.arrayBuffer(), decodeAudio)
    // Stored even if another track is shown by now, so the expensive decode is not repeated
    try {
        await database.write(async () => {
            await track.update((t) => {
                t.waveform = JSON.stringify(waveform)
                t.length = lengthMs
            })
        })
    } catch (error) {
        // E.g. the track was deleted meanwhile, the computed waveform is still shown
        console.warn('Could not store the waveform', error)
    }
    return waveform
}

const computeOnce = (track: TrackWithClips) => {
    let promise = pending.get(track.id)
    if (!promise) {
        promise = computeAndStore(track).finally(() => pending.delete(track.id))
        pending.set(track.id, promise)
    }
    return promise
}

/**
 * The waveform of the track. Uses the stored waveform, otherwise it is computed from the stored audio file
 * once and saved with the track. Returns null while loading.
 */
export const useWaveform = (track: TrackWithClips | null) => {
    const storedJson = track?.waveform
    const stored = useMemo(() => parseStoredWaveform(storedJson), [storedJson])
    const [computed, setComputed] = useState<{ trackId: string; waveform: number[] }>()

    useEffect(() => {
        if (!track || stored || failedTracks.has(track.id)) return
        let active = true
        computeOnce(track)
            .then((waveform) => {
                if (active) setComputed({ trackId: track.id, waveform })
            })
            .catch((error) => {
                console.warn('Could not compute the waveform', error)
                failedTracks.add(track.id)
                // Show an empty waveform instead of loading forever
                if (active) setComputed({ trackId: track.id, waveform: NO_WAVEFORM })
            })
        return () => {
            active = false
        }
    }, [track, stored])

    if (stored) return stored
    if (computed && computed.trackId === track?.id) return computed.waveform
    return track && failedTracks.has(track.id) ? NO_WAVEFORM : null
}
