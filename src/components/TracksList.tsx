import { TracksListItem } from '@/components/TracksListItem'
import { selectTrack } from '@/helpers/player'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { t } from '@/i18n'
import TrackWithClips from '@/model/track'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'

export type TracksListProps = Partial<FlatListProps<TrackWithClips>> & {
    tracks: TrackWithClips[]
}

export const TracksList = ({ tracks, ...flatlistProps }: TracksListProps) => {
    const { currentTrack } = useCurrentTrack()

    return (
        <FlatList
            data={tracks}
            keyExtractor={(track) => track.id}
            extraData={currentTrack?.id}
            contentContainerStyle={{ paddingTop: 0, paddingBottom: 60 }}
            ListEmptyComponent={
                <View>
                    <Text style={utilsStyles.emptyContentText}>{t.noSongs}</Text>
                </View>
            }
            renderItem={({ item: track, index }) => (
                <TracksListItem
                    track={track}
                    title={track.title}
                    color={track.color}
                    index={index}
                    isActive={currentTrack?.id === track.id}
                    onTrackSelect={selectTrack}
                />
            )}
            {...flatlistProps}
        />
    )
}
