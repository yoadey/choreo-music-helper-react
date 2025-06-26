import { database } from '@/model/index.web';
import TrackWithClips from '@/model/track';
import { FontAwesome6 } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';
import { set } from 'idb-keyval';
import React, { useLayoutEffect, useRef } from 'react';
import { TouchableOpacity } from 'react-native';


export const useNavigationOpenFile = ({
}: {
	}) => {
	const navigation = useNavigation<NativeStackNavigationProp<any>>();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const openFilePicker = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file && file.type.startsWith('audio/')) {
			
            const tracksCollection = database.get<TrackWithClips>('tracks'); // Tabellenname ggf. anpassen
            let track = await database.write(async () => {
                let track = await tracksCollection.create((track: TrackWithClips) => {
					track.title = file.name;
                    track.uri = file.name;
                });
				return track
            });
			await set(track.id, file);
		}
	};

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<>
					<TouchableOpacity onPress={openFilePicker} style={{ paddingRight: 20 }}>
						<FontAwesome6 name="folder-open" size={22} color="#FFFFFF" solid />
					</TouchableOpacity>
					<input
						type="file"
						accept="audio/*"
						ref={fileInputRef}
						onChange={handleFileChange}
						style={{ display: 'none' }}
					/>
				</>
			),
		});
	}, [navigation]);

	return null;
}