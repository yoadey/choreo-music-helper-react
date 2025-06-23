import { TracksListItem } from '@/components/TracksListItem'
import { utilsStyles } from '@/styles'
import { useEffect, useState } from 'react'
import { FlatList, FlatListProps, Text, View } from 'react-native'
import TrackPlayer, { Track, useActiveTrack } from 'react-native-track-player'

import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { getLastTrack, setLastTrack } from '@/store/playbackState'
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
	const track = useActiveTrack()

	const handleTrackSelect = async (selectedTrack: TrackWithClips) => {
		if (!selectedTrack || !tracks) {
			return;
		}

		setLastTrack(selectedTrack.id)

		var uri: string[] = [""]
		audioFiles.forEach(file => {
			if (file.name === selectedTrack.uri) {
				uri[0] = file.url;
			}
		});

		await TrackPlayer.reset()
		const track: Track = {
			id: selectedTrack.id,
			url: uri[0],
			title: selectedTrack.title,
		};
		await TrackPlayer.add(track);
	}

	// TODO: loadAudioFiles etc to a more general place
	useEffect(() => {
		const fileNames: string[] = []
		tracks.forEach(track => {
			fileNames.push(track.uri);
		});
		loadAudioFiles(fileNames);
	}, [tracks]);

	useEffect(() => {
		let trackId = getLastTrack();
		if (trackId && trackId !== track?.id) {
			database.get<TrackWithClips>("tracks")
				.find(trackId)
				.then(handleTrackSelect)
		}
	}, [audioFiles])


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
