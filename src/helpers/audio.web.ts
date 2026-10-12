import type { AudioMetadata, DecodedAudio } from './audioImport'

/** Low sample rate for the waveform: keeps the decoded PCM data small, which matters on mobile devices. */
const ANALYSIS_SAMPLE_RATES = [8000, 22050, 44100]

type OfflineContextConstructor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext

const createOfflineContext = (): OfflineAudioContext => {
    const Context: OfflineContextConstructor | undefined =
        window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: OfflineContextConstructor }).webkitOfflineAudioContext
    if (!Context) throw new Error('Web Audio API is not supported')
    let lastError: unknown
    // Older Safari versions only support a limited range of sample rates
    for (const sampleRate of ANALYSIS_SAMPLE_RATES) {
        try {
            return new Context(1, 1, sampleRate)
        } catch (error) {
            lastError = error
        }
    }
    throw lastError
}

/** Decodes the audio data (detaches the buffer). The result is resampled to a low sample rate. */
export const decodeAudio = (buffer: ArrayBuffer): Promise<DecodedAudio> => {
    const context = createOfflineContext()
    return new Promise<AudioBuffer>((resolve, reject) => {
        // The callback variant is required by older Safari versions, newer browsers also return a promise
        const result = context.decodeAudioData(buffer, resolve, reject) as Promise<AudioBuffer> | undefined
        result?.then(resolve, reject)
    }).then((audioBuffer) => ({ channelData: audioBuffer.getChannelData(0), duration: audioBuffer.duration }))
}

export const parseAudioMetadata = async (blob: Blob): Promise<AudioMetadata> => {
    const { parseBlob } = await import('music-metadata')
    const metadata = await parseBlob(blob, { includeChapters: true, skipCovers: true })
    return {
        title: metadata.common.title,
        chapters: metadata.format.chapters?.map((chapter) => ({
            title: chapter.title,
            start: chapter.start,
            timeScale: chapter.timeScale,
        })),
    }
}

/** Asks the browser to keep the data (Safari deletes website data after 7 days without use otherwise). */
export const requestPersistentStorage = async () => {
    try {
        if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
            await navigator.storage.persist()
        }
    } catch {
        // Not supported, the data is still stored, just not protected against eviction
    }
}
