import { ClipsList } from '@/components/ClipList'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { useSortedClips } from '@/hooks/useSortedClips'
import { defaultStyles } from '@/styles'
import { View } from 'react-native'

const ClipsScreen = () => {
	const { currentTrack } = useCurrentTrack()
	const clips = useSortedClips(currentTrack)

	return (
		<View style={defaultStyles.container}>
			<ClipsList clips={clips} trackLength={(currentTrack?.length ?? 0) / 1000} />
		</View>
	)
}

export default ClipsScreen
