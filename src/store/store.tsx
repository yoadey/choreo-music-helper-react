import TrackWithClips from '@/model/track'
import { create } from 'zustand'

type CurrentTrackStore = {
	currentTrack: TrackWithClips | null
	setCurrentTrack: (track: TrackWithClips | null) => void
}

type LoopStatusStore = {
	/** True if A and B are set and form a valid loop, published by the playback service */
	active: boolean
	setActive: (active: boolean) => void
}

export const useLoopStatusStore = create<LoopStatusStore>()((set) => ({
	active: false,
	setActive: (active) => set({ active }),
}))

export const useCurrentTrackStore = create<CurrentTrackStore>()((set) => ({
	currentTrack: null,
	setCurrentTrack: (track) => set({ currentTrack: track }),
}))
