import TrackWithClips from '@/model/track'
import { create } from 'zustand'

type CurrentTrack = {
	currentTrack: TrackWithClips | null
	setCurrentTrack: (track: TrackWithClips) => void
}

export const useCurrentTrackStore = create<CurrentTrack>()((set) => ({
	currentTrack: null,
	setCurrentTrack: (track) => set({ currentTrack: track }),
}))

type AudioFilesStore = {
	audioFiles: Map<string, string>
	setAudioFiles: (audioFiles: Map<string, string>) => void
}

export const useAudioFilesStore = create<AudioFilesStore>()((set) => ({
	audioFiles: new Map<string, string>(),
	setAudioFiles: (audioFiles) => set({ audioFiles: audioFiles }),
}))
