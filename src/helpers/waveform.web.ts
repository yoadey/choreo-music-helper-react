export async function extractWaveform(arrayBuffer: ArrayBuffer, resolution: number): Promise<{ waveform: number[]; duration: number }> {
  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const rawData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(rawData.length / resolution);
  const waveform: number[] = [];
  for (let i = 0; i < resolution; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[i * blockSize + j] || 0);
    }
    waveform.push(sum / blockSize);
  }
  return { waveform, duration: Math.round(audioBuffer.duration * 1000) };
}
