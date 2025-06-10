import { ClipsList } from '@/components/ClipList'
import { screenPadding } from '@/constants/tokens'
import { Clip } from '@/helpers/types'
import { useClips, useTracks } from '@/store/library'
import { useQueue } from '@/store/queue'
import { defaultStyles } from '@/styles'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import TrackPlayer, { Track } from 'react-native-track-player'

const AddToPlaylistModal = () => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()

	const { activeQueueId } = useQueue()

	const { trackUrl } = useLocalSearchParams<{ trackUrl: Track['url'] }>()

	const tracks = useTracks()

	const { clips: playlists, addToPlaylist } = useClips()

	const track = tracks.find((currentTrack) => trackUrl === currentTrack.url)

	// track was not found
	if (!track) {
		return null
	}

	const availablePlaylists = playlists.filter(
		(playlist) => !playlist.tracks.some((playlistTrack) => playlistTrack.url === track.url),
	)

	const handlePlaylistPress = async (playlist: Clip) => {
		addToPlaylist(track, playlist.name)

		// should close the modal
		router.dismiss()

		// if the current queue is the playlist we're adding to, add the track at the end of the queue
		if (activeQueueId?.startsWith(playlist.name)) {
			await TrackPlayer.add(track)
		}
	}

	return (
		<SafeAreaView style={[styles.modalContainer, { paddingTop: headerHeight }]}>
			<ClipsList clips={availablePlaylists} onClipPress={handlePlaylistPress} />
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	modalContainer: {
		...defaultStyles.container,
		paddingHorizontal: screenPadding.horizontal,
	},
})

export default AddToPlaylistModal
