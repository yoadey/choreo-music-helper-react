import { screenPadding } from '@/constants/tokens'
import { useClips } from '@/store/library'
import { defaultStyles } from '@/styles'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { ScrollView, View } from 'react-native'

const PlaylistScreen = () => {
	const { name: playlistName } = useLocalSearchParams<{ name: string }>()

	const { clips } = useClips()

	if (!clips) {
		console.warn(`Playlist ${playlistName} was not found!`)

		return <Redirect href={'/(tabs)/playlists'} />
	}

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ paddingHorizontal: screenPadding.horizontal }}
			>
				{/* <ClipsList clips={playlist} /> */}
			</ScrollView>
		</View>
	)
}

export default PlaylistScreen
