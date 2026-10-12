import { decodeAudio } from '@/helpers/audio'
import { computeWaveform, parseStoredWaveform, WAVEFORM_RESOLUTION } from '@/helpers/audioImport'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { get } from 'idb-keyval'
import { useEffect, useMemo, useState } from 'react'

/**
 * The waveform of the track. Uses the stored waveform, otherwise it is computed from the stored audio file
 * once and saved with the track. Returns null while loading.
 */
export const useWaveform = (track: TrackWithClips | null) => {
    const storedJson = track?.waveform
    const stored = useMemo(() => parseStoredWaveform(storedJson), [storedJson])
    const [computed, setComputed] = useState<{ trackId: string; waveform: number[] }>()

    useEffect(() => {
        if (!track || stored) return
        let active = true
        const compute = async () => {
            const blob = await get<Blob>(track.uri)
            if (!blob) throw new Error(`Audio file not found: ${track.uri}`)
            const { channelData, duration } = await decodeAudio(await blob.arrayBuffer())
            const waveform = computeWaveform(channelData, WAVEFORM_RESOLUTION)
            if (!active) return
            setComputed({ trackId: track.id, waveform })
            await database.write(async () => {
                await track.update((t) => {
                    t.waveform = JSON.stringify(waveform)
                    t.length = Math.round(duration * 1000)
                })
            })
        }
        compute().catch((error) => {
            console.warn('Could not compute the waveform', error)
            // Show an empty waveform instead of loading forever
            if (active) setComputed({ trackId: track.id, waveform: [] })
        })
        return () => {
            active = false
        }
    }, [track, stored])

    if (stored) return stored
    return computed && computed.trackId === track?.id ? computed.waveform : null
}
