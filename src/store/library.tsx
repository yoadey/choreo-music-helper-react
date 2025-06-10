import library from '@/assets/data/library.json'
import { TrackWithClips } from '@/helpers/types'
import { Track } from 'react-native-track-player'

interface LibraryState {
	tracks: TrackWithClips[]
	splitTrack: (track: Track, position: number) => void
}

export const useLibraryStore = ((state: any) => ({
	tracks: library,
	splitTrack: (track: Track, position: number) => { },
})
)

export const useTracks = () => useLibraryStore((state: any) => state.tracks)

export const useClips = () => {
	//var clips = useLibraryStore((state: any) => {
	//	return state.tracks[0].clips
	//})

	//if (!clips) {
	var	clips :any = [];
	//}
	const addToPlaylist = useLibraryStore((state: any) => state.splitTrack)

	return { clips: clips, addToPlaylist }
}
