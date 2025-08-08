import { TracksList } from '@/components/TracksList'
import { screenPadding } from '@/constants/tokens'
import { generateTracksListId } from '@/helpers/miscellaneous'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { defaultStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { ScrollView, View } from 'react-native'

const SongsScreen = ({ tracks }: { tracks: TrackWithClips[] }) => {

	return (
		<View style={defaultStyles.container}>
			<ScrollView
				contentInsetAdjustmentBehavior="automatic"
				style={{ paddingHorizontal: screenPadding.horizontal }}
			>
				<TracksList
					id={generateTracksListId('songs', "")}
					tracks={tracks}
					scrollEnabled={false}
				/>
			</ScrollView>
		</View>
	)
}

const enhance = withObservables<{}, { tracks: TrackWithClips[] }>([], () => ({
	// @ts-ignore
	tracks: database.collections
		.get<TrackWithClips>("tracks")
		.query().observe()
}));

export default enhance(SongsScreen)
