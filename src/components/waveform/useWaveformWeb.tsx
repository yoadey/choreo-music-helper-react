import { useEffect, useState } from "react";



export const useWaveformWeb = ({ mp3Url, resolution, baseline }: { mp3Url: string | undefined, resolution: number, baseline: number }) => {
  const [waveform, setWaveform] = useState<number[] | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>()

  useEffect(() => {
    let active = true
    load()
    return () => { active = false }

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
      setAudioBuffer(audioBuffer)
    }
  }, [mp3Url]);

  useEffect(() => {
    if (audioBuffer) {
      const rawData = audioBuffer.getChannelData(0) // Mono
      const blockSize = Math.floor(rawData.length / resolution)

      const waveform: number[] = []
      for (let i = 0; i < resolution; i++) {
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j] || 0)
        }
        waveform.push(sum / blockSize)
      }
      setWaveform(waveform)
    } else {
      if (waveform?.length !== resolution) {
        setWaveform(Array(resolution).fill(baseline))
      }
    }
  }, [audioBuffer?.length, resolution, baseline]);

  return waveform
}
