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
                        contentContainerStyle={{ paddingTop: 0, paddingBottom: 60 }}
                        ListEmptyComponent={
                                <View>
                                        <Text style={utilsStyles.emptyContentText}>No songs found</Text>
                                </View>
                        }
                        renderItem={({ item: track, index }) => (
                                <TracksListItem track={track} index={index} onTrackSelect={setCurrentTrack} />
                        )}
                        {...flatlistProps}
                />
        )
}
