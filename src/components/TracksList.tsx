import { TracksListItem } from '@/components/TracksListItem'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'

import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import TrackWithClips from '@/model/track'

export type TracksListProps = Partial<FlatListProps<TrackWithClips>> & {
	id: string
	tracks: TrackWithClips[]
	hideQueueControls?: boolean
}

const ItemDivider = () => (
	<View style={{ ...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60 }} />
)

export const TracksList = ({
	id,
	tracks,
	hideQueueControls = false,
	...flatlistProps
}: TracksListProps) => {
	const { setCurrentTrack } = useCurrentTrack()

	return (
		<FlatList
			data={tracks}
			contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
			ListFooterComponent={ItemDivider}
			ItemSeparatorComponent={ItemDivider}
			ListEmptyComponent={
				<View>
					<Text style={utilsStyles.emptyContentText}>No songs found</Text>
				</View>
			}
			renderItem={({ item: track }) => (
				<TracksListItem track={track} onTrackSelect={setCurrentTrack} />
			)}
			{...flatlistProps}
		/>
	)
}
