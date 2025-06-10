import { ClipsList } from '@/components/ClipList'
import { screenPadding } from '@/constants/tokens'
import { playlistNameFilter } from '@/helpers/filter'
import { Clip } from '@/helpers/types'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import { useClips } from '@/store/library'
import { defaultStyles } from '@/styles'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ScrollView, View } from 'react-native'

const PlaylistsScreen = () => {
	const router = useRouter()

	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: 'Find in playlists',
		},
	})

	const { clips: playlists } = useClips()

	const filteredPlaylists = useMemo(() => {
		return playlists.filter(playlistNameFilter(search))
	}, [playlists, search])

	const handlePlaylistPress = (playlist: Clip) => {
		router.push(`/(tabs)/playlists/${playlist.name}`)
	}

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{
					paddingHorizontal: screenPadding.horizontal,
				}}
			>
				<ClipsList
					scrollEnabled={false}
					clips={filteredPlaylists}
					onClipPress={handlePlaylistPress}
				/>
			</ScrollView>
		</View>
	)
}

export default PlaylistsScreen
