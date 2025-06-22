import { TracksListItem } from '@/components/TracksListItem'
import { utilsStyles } from '@/styles'
import { useEffect, useState } from 'react'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import TrackPlayer, { Track } from 'react-native-track-player'

import TrackWithClips from '@/model/track'
import { get } from 'idb-keyval'

export type TracksListProps = Partial<FlatListProps<TrackWithClips>> & {
	id: string
	tracks: TrackWithClips[]
	hideQueueControls?: boolean
}

const ItemDivider = () => (
	<View style={{ ...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60 }} />
)

interface AudioFile {
	name: string;
	url: string;
}

export const TracksList = ({
	id,
	tracks,
	hideQueueControls = false,
	...flatlistProps
}: TracksListProps) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);

	const handleTrackSelect = async (selectedTrack: TrackWithClips) => {
	
		if (! selectedTrack || !tracks) {
			return;
		}
		var uri: string[] = [""]
	    audioFiles.forEach(file => {
			if (file.name === selectedTrack.uri) {
				uri[0] = file.url;	
			}
		});

		TrackPlayer.reset()
		const track : Track = {
			id: selectedTrack.id,
			url: uri[0],
			title: selectedTrack.title,
		};
		await TrackPlayer.add(track);
	}

	useEffect(() => {
		const fileNames: string[] = []
		tracks.forEach(track => {
			fileNames.push(track.uri);
		});
		loadAudioFiles(fileNames);
	}, [tracks]);

	const loadAudioFiles = async (fileNames: string[]) => {
		const loaded: AudioFile[] = [];
		for (const name of fileNames) {
			const blob = await get<Blob>(name);
			if (blob) {
				const url = URL.createObjectURL(blob);
				loaded.push({ name, url });
			}
		}
		setAudioFiles(loaded);
	};
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
