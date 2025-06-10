import { Track } from 'react-native-track-player'

export type Clip = {
	name: string
	color: string
	track: Track
	start: number
}

export type TrackWithClips = Track & { clips?: Clip[] }
