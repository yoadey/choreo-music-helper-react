import type { AudioMetadata, DecodedAudio } from './audioImport'

// Native platforms play the files directly, the Web Audio based analysis is only available on the web (audio.web.ts).

export const decodeAudio = async (_buffer: ArrayBuffer): Promise<DecodedAudio> => {
    throw new Error('Audio decoding is only supported on the web')
}

export const parseAudioMetadata = async (_blob: Blob): Promise<AudioMetadata> => ({})

export const requestPersistentStorage = async () => undefined
