import { TracksListItem } from '@/components/TracksListItem'
import { utilsStyles } from '@/styles'
import { useEffect } from 'react'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import TrackPlayer, { Track, useActiveTrack } from 'react-native-track-player'

import { useStoredAudioFiles } from '@/hooks/useStoredAudioFiles'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { getLastTrack, setLastTrack } from '@/store/playbackState'

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
	const track = useActiveTrack()
	const audioFiles = useStoredAudioFiles()

	const handleTrackSelect = async (selectedTrack: TrackWithClips) => {
		if (!selectedTrack || !tracks) {
			return;
		}

		setLastTrack(selectedTrack.id)

		var uri: string[] = [""]
		if (audioFiles && audioFiles.has(selectedTrack.uri)) {
			uri[0] = selectedTrack.uri
		}

		await TrackPlayer.reset()
		const track: Track = {
			id: selectedTrack.id,
			url: uri[0],
			title: selectedTrack.title,
		};
		await TrackPlayer.add(track);
	}

	useEffect(() => {
		let trackId = getLastTrack();
		if (trackId && trackId !== track?.id) {
			database.get<TrackWithClips>("tracks")
				.find(trackId)
				.then(handleTrackSelect)
		}
	}, [])

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
				<TracksListItem track={track} onTrackSelect={handleTrackSelect} />
			)}
			{...flatlistProps}
		/>
	)
}
