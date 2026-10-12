/**
 * Analysis of an imported audio file: metadata, chapters and waveform.
 * Clip positions are in seconds, the track length in milliseconds (as stored in the database).
 */

export const WAVEFORM_RESOLUTION = 1000
import { TRANSPARENT } from '@/constants/tokens'

export type ImportedClip = { title: string; position: number; color: string }

export type AnalyzedAudio = {
    key: string
    name: string
    title: string
    lengthMs: number
    waveform: number[]
    clips: ImportedClip[]
}

/**
 * Chapter start: seconds, or units of timeScale if given (MP4 chapters), as reported by music-metadata.
 */
export type AudioChapter = { title?: string; start: number; timeScale?: number }

export type AudioMetadata = { title?: string; chapters?: AudioChapter[] }

export type DecodedAudio = { channelData: Float32Array; duration: number }

export type AnalyzeDeps = {
    now: () => number
    parseMetadata: (blob: Blob) => Promise<AudioMetadata>
    /** May detach the passed buffer (like AudioContext.decodeAudioData). */
    decode: (buffer: ArrayBuffer) => Promise<DecodedAudio>
    /** Title for untitled chapters (1-based number) */
    untitledChapter?: (n: number) => string
}

/** IndexedDB key for an imported file. The timestamp makes the key unique, also for names without extension. */
export const makeUniqueAudioKey = (name: string, timestamp: number) => {
    const match = /^(.*?)(\.[\w-]+)?$/.exec(name)
    const base = match?.[1] ?? name
    const extension = match?.[2] ?? ''
    return `/audio/${encodeURIComponent(`${base}_${timestamp}${extension}`)}`
}

const chapterStartSeconds = ({ start, timeScale }: AudioChapter) => (timeScale && timeScale > 0 ? start / timeScale : start)

/** Converts chapters into clips (positions in seconds). Without chapters a single clip at the start is created. */
export const chaptersToClips = (
    chapters: AudioMetadata['chapters'],
    fallbackTitle: string,
    untitled: (n: number) => string = (n) => `Clip ${n}`,
): ImportedClip[] => {
    if (!chapters?.length) {
        return [{ title: fallbackTitle, position: 0, color: TRANSPARENT }]
    }
    return chapters.map((chapter, index) => ({
        title: chapter.title || untitled(index + 1),
        position: Math.max(chapterStartSeconds(chapter), 0),
        color: TRANSPARENT,
    }))
}

/** Mean absolute amplitude for `resolution` blocks of the channel data. */
export const computeWaveform = (channelData: Float32Array, resolution: number): number[] => {
    const blockSize = Math.max(channelData.length / resolution, 1)
    const waveform: number[] = []
    for (let i = 0; i < resolution; i++) {
        const from = Math.floor(i * blockSize)
        const to = Math.min(Math.floor((i + 1) * blockSize), channelData.length)
        let sum = 0
        for (let j = from; j < to; j++) {
            sum += Math.abs(channelData[j])
        }
        waveform.push(to > from ? sum / (to - from) : 0)
    }
    return waveform
}

type NativeTag = { id: string; value: unknown }
type ChapterFrame = { info?: { startTime?: number }; frames?: Map<string, unknown> | Record<string, unknown> }

/**
 * Chapters from the raw ID3 CHAP frames. music-metadata's format.chapters skips chapters without title,
 * so they are read from the native tags. Returns undefined if the file has no CHAP frames.
 */
export const id3Chapters = (tags: readonly NativeTag[] | undefined): AudioChapter[] | undefined => {
    const chapters = (tags ?? [])
        .filter((tag) => tag.id === 'CHAP')
        .map((tag) => {
            const { info, frames } = tag.value as ChapterFrame
            const title = frames instanceof Map ? frames.get('TIT2') : frames?.TIT2
            return { title: typeof title === 'string' ? title : undefined, start: (info?.startTime ?? 0) / 1000 }
        })
        .sort((a, b) => a.start - b.start)
    return chapters.length ? chapters : undefined
}

/** Waveform and length (ms) of the audio data. The buffer may be detached afterwards. */
export const analyzeWaveform = async (buffer: ArrayBuffer, decode: AnalyzeDeps['decode']) => {
    const { channelData, duration } = await decode(buffer)
    return { waveform: computeWaveform(channelData, WAVEFORM_RESOLUTION), lengthMs: Math.round(duration * 1000) }
}

export const analyzeAudio = async (blob: Blob, name: string, deps: AnalyzeDeps): Promise<AnalyzedAudio> => {
    // Read the metadata first: decoding detaches the ArrayBuffer, it must not be used afterwards.
    let metadata: AudioMetadata = {}
    try {
        metadata = await deps.parseMetadata(blob)
    } catch (error) {
        console.warn('Could not read audio metadata', error)
    }
    const { waveform, lengthMs } = await analyzeWaveform(await blob.arrayBuffer(), deps.decode)
    const title = metadata.title || name
    return {
        key: makeUniqueAudioKey(name, deps.now()),
        name,
        title,
        lengthMs,
        waveform,
        clips: chaptersToClips(metadata.chapters, title, deps.untitledChapter),
    }
}

/** Parses the waveform stored with a track. Returns null if it is missing or invalid. */
export const parseStoredWaveform = (json: string | null | undefined): number[] | null => {
    if (!json) return null
    try {
        const value: unknown = JSON.parse(json)
        if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number')) {
            return value
        }
    } catch {
        // Broken data, the waveform is computed again
    }
    return null
}
