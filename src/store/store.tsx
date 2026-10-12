import TrackWithClips from '@/model/track'
import { create } from 'zustand'

type CurrentTrackStore = {
	currentTrack: TrackWithClips | null
	setCurrentTrack: (track: TrackWithClips | null) => void
}

export const useCurrentTrackStore = create<CurrentTrackStore>()((set) => ({
	currentTrack: null,
	setCurrentTrack: (track) => set({ currentTrack: track }),
}))
