import { TracksList } from '@/components/TracksList'
import { screenPadding } from '@/constants/tokens'
import { generateTracksListId } from '@/helpers/miscellaneous'
import { useNavigationSearch } from '@/hooks/useNavigationSearch'
import TrackWithClips from '@/model/track'
import { defaultStyles } from '@/styles'
import { Database } from '@nozbe/watermelondb'
import { withObservables } from '@nozbe/watermelondb/react'
import { ScrollView, View } from 'react-native'
import { Track } from 'react-native-track-player'

const SongsScreen = ({ tracks }: { tracks: TrackWithClips[] }) => {
	const search = useNavigationSearch({
		searchBarOptions: {
			placeholder: 'Find in songs',
		},
	})

	var tracksForPlayer: Track[] = []
	tracks.forEach(track => {
		tracksForPlayer.push({
			url: track.uri
		})	
	});

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ paddingHorizontal: screenPadding.horizontal }}
			>
				<TracksList
					id={generateTracksListId('songs', search)}
					tracks={tracksForPlayer}
					scrollEnabled={false}
				/>
			</ScrollView>
		</View>
	)
}

interface Props {
	database: Database;
	tracks: Track[]
  }

const enhance = withObservables<Props, keyof Props>([], ({ database }) => ({
	tracks: database.collections
		.get("tracks")
		.query()
}));

export default enhance(SongsScreen)
