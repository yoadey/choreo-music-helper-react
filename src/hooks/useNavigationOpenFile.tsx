import Clip from '@/model/clip';
import { database } from '@/model/index.web';
import TrackWithClips from '@/model/track';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from 'expo-router';
import { set } from 'idb-keyval';
import React, { useLayoutEffect } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { useCurrentTrack } from './useCurrentTrack';


export const useNavigationOpenFile = ({
}: {
	}) => {
	const navigation = useNavigation<NativeStackNavigationProp<any>>();
	const { setCurrentTrack } = useCurrentTrack()

	const handlePick = async () => {
		const pickerResult = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: false });

		if (pickerResult?.assets?.length) {
			const file = pickerResult.assets[0];
			const originalName = file.name;
			const fileUri = file.uri;

			const timestamp = Date.now();
			const uniqueName = originalName.replace(/(\.[\w\d_-]+)$/i, `_${timestamp}$1`);
			let trackTitle = '';

			if (Platform.OS === 'web') {
				const blob = await fetch(fileUri).then(res => res.blob());
				const key = `/audio/${encodeURIComponent(uniqueName)}`;

				set(key, blob)

				return { uri: key, name: originalName, title: trackTitle };
			} else {
				return { uri: fileUri, name: originalName, title: '' }; // Metadaten in Native optional
			}
		}

		throw new Error('Keine Datei ausgewählt');
	};

	const handleChooseFile = () => {
		handlePick()
			.then(({ uri, name, title }) => {
				database.write(async () => {
					var tracksCollection = database.get<TrackWithClips>('tracks')
					let track = await tracksCollection.create((track: TrackWithClips) => {
						track.title = title ? title : name;
						track.uri = uri;
					});
					await database.get<Clip>('clips').create((clip) => {
						clip.track.set(track)
						clip.title = title ? title : name;
						clip.position = 0;
						clip.color = `#00000000`;
					});

					return await tracksCollection.find(track.id);
				}).then(track => {
					setCurrentTrack(track);
				});
			})
			.catch(err => {
				console.warn(err.message);
			});
	};

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<>
					<TouchableOpacity onPress={handleChooseFile} style={{ paddingRight: 20 }}>
						<FontAwesome6 name="folder-open" size={22} color="#FFFFFF" solid />
					</TouchableOpacity>
				</>
			),
		});
	}, [navigation]);

	return null;
}