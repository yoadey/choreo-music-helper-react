import { useEffect, useState } from 'react'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'

export const useWaveformWeb = ({
    mp3Url,
    resolution,
    baseline,
    trackId,
}: {
    mp3Url: string | undefined
    resolution: number
    baseline: number
    trackId?: string
}) => {
    const [waveform, setWaveform] = useState<number[] | null>(null)
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>()

    useEffect(() => {
        if (!trackId) return
        database
            .get<TrackWithClips>('tracks')
            .find(trackId)
            .then((track) => {
                if (track.waveform) {
                    try {
                        setWaveform(JSON.parse(track.waveform))
                    } catch {
                        /* empty */
                    }
                }
            })
    }, [trackId])

    // intentionally omit `waveform` from deps for performance
    useEffect(() => {
        if (waveform) return
        let active = true
        load()
        return () => {
            active = false
        }

        async function load() {
            if (!mp3Url) {
                setAudioBuffer(undefined)
                setWaveform(null)
                return
            }
            const response = await fetch(mp3Url)
            const arrayBuffer = await response.arrayBuffer()

            const audioCtx = new window.AudioContext()
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
            if (active) setAudioBuffer(audioBuffer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mp3Url])

    // keep dependency list minimal to avoid frequent re-execution with large objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (audioBuffer && !waveform) {
            const rawData = audioBuffer.getChannelData(0) // Mono
            const blockSize = Math.floor(rawData.length / resolution)

            const wf: number[] = []
            for (let i = 0; i < resolution; i++) {
                let sum = 0
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[i * blockSize + j] || 0)
                }
                wf.push(sum / blockSize)
            }
            setWaveform(wf)
            if (trackId) {
                database.write(async () => {
                    const track = await database.get<TrackWithClips>('tracks').find(trackId)
                    await track.update(() => {
                        track.waveform = JSON.stringify(wf)
                        track.length = Math.round(audioBuffer.duration * 1000)
                    })
                })
            }
        } else if (!waveform) {
            setWaveform(Array(resolution).fill(baseline))
        }
    }, [audioBuffer, resolution, baseline, trackId])

    return waveform
}
