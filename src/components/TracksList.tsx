import { TracksListItem } from '@/components/TracksListItem'
import { selectTrack } from '@/helpers/player'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { t } from '@/i18n'
import TrackWithClips from '@/model/track'
import { utilsStyles } from '@/styles'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import { useIsPlaying } from 'react-native-track-player'

export type TracksListProps = Partial<FlatListProps<TrackWithClips>> & {
    tracks: TrackWithClips[]
}

export const TracksList = ({ tracks, ...flatlistProps }: TracksListProps) => {
    const { currentTrack } = useCurrentTrack()
    // Read once for the whole list, only the active row shows it
    const { playing } = useIsPlaying()

    return (
        <FlatList
            data={tracks}
            keyExtractor={(track) => track.id}
            extraData={[currentTrack?.id, playing]}
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
                    isPlaying={currentTrack?.id === track.id && !!playing}
                    onTrackSelect={selectTrack}
                />
            )}
            {...flatlistProps}
        />
    )
}
