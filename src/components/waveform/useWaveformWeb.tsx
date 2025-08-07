export async function extractWaveformWeb(mp3Url: string | undefined, barsPerSecond = 1): Promise<{ waveform: number[], duration: number }> {
  if (! mp3Url) {
    return { waveform: [], duration: 0 }
  }
  const response = await fetch(mp3Url)
  const arrayBuffer = await response.arrayBuffer()

  const audioCtx = new window.AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  const rawData = audioBuffer.getChannelData(0) // Mono
  const duration = audioBuffer.duration
  const resolution = duration * barsPerSecond
  const blockSize = Math.floor(rawData.length / resolution)

  const waveform: number[] = []
  for (let i = 0; i < resolution; i++) {
    let sum = 0
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[i * blockSize + j] || 0)
    }
    waveform.push(sum / blockSize)
  }

  return { waveform, duration }
}
