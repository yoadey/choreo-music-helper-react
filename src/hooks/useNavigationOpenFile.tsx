import Clip from '@/model/clip';
import { database } from '@/model/index.web';
import TrackWithClips from '@/model/track';
import { FontAwesome6 } from '@expo/vector-icons';
import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from 'expo-router';
import React, { useLayoutEffect } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { useCurrentTrack } from './useCurrentTrack';

const AUDIO_TYPES = [
  // generisch
  'audio/*',

  // spezifische MIMEs
  'audio/mpeg',       // mp3
  'audio/mp4',        // m4a
  'audio/aac',
  'audio/wav',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
  'audio/webm',

  // Dateiendungen (iOS sehr zuverlässig)
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
  '.oga',
  '.opus',
  '.weba',
  '.aiff',
  '.aif',
  '.caf',
  '.alac',
  '.amr',
  '.mid',
  '.midi',
];

export const useNavigationOpenFile = () => {
        const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
        const { setCurrentTrack } = useCurrentTrack()

        type PickedFile = { uri: string; name: string; title: string; length: number; waveform: number[]; clips: { title: string; position: number; color: string }[] }

        const handlePick = async (): Promise<PickedFile> => {
                const pickerResult = await DocumentPicker.getDocumentAsync({ type: AUDIO_TYPES, copyToCacheDirectory: false });

                if (pickerResult?.assets?.length) {
                        const file = pickerResult.assets[0];
                        const originalName = file.name;
                        const fileUri = file.uri;

                        const timestamp = Date.now();
                        const uniqueName = originalName.replace(/(\.[\w\d_-]+)$/i, `_${timestamp}$1`);

                        if (Platform.OS === 'web') {
                                const { set } = await import('idb-keyval');
                                const response = await fetch(fileUri);
                                const blob = await response.blob();
                                const arrayBuffer = await blob.arrayBuffer();
                                const { extractWaveform } = await import('@/helpers/waveform.web');
                                const { waveform, duration } = await extractWaveform(arrayBuffer, 1000);
                                const mm = await import('music-metadata');
                                type ChapFrame = { id: string; value: { tags?: { title?: string }; startTimeMs?: number } };
                                const arrayBufferMetaData = await blob.arrayBuffer();
                                const metadata = await mm.parseBuffer(Buffer.from(arrayBufferMetaData), 'audio/mpeg');
                                const frames = (metadata.native?.['ID3v2.4'] as ChapFrame[] | undefined) ||
                                        (metadata.native?.['ID3v2.3'] as ChapFrame[] | undefined) ||
                                        [];
                                const chapters = frames
                                        .filter((f) => f.id === 'CHAP')
                                        .map((chap, i) => ({
                                                title: chap.value.tags?.title || `Clip ${i + 1}`,
                                                position: chap.value.startTimeMs || 0,
                                                color: '#00000000',
                                        }));
                                const key = `/audio/${encodeURIComponent(uniqueName)}`;
                                await set(key, blob);
                                return {
                                        uri: key,
                                        name: originalName,
                                        title: metadata.common.title || '',
                                        length: duration,
                                        waveform,
                                        clips: chapters,
                                };
                        } else {
                                return { uri: fileUri, name: originalName, title: '', length: 0, waveform: [], clips: [] }; // Native path
                        }
                }

                throw new Error('Keine Datei ausgewählt');
        };

	const handleChooseFile = () => {
		handlePick()
                        .then(({ uri, name, title, length, waveform, clips }) => {
                                database.write(async () => {
                                        const tracksCollection = database.get<TrackWithClips>('tracks');
                                        const track = await tracksCollection.create((t: TrackWithClips) => {
                                                t.title = title ? title : name;
                                                t.uri = uri;
                                                t.length = length;
                                                t.waveform = JSON.stringify(waveform);
                                                t.color = `#00000000`;
                                        });
                                        if (clips.length > 0) {
                                                for (const c of clips) {
                                                        await database.get<Clip>('clips').create((clip) => {
                                                                clip.track.set(track);
                                                                clip.title = c.title;
                                                                clip.position = c.position;
                                                                clip.color = c.color;
                                                        });
                                                }
                                        } else {
                                                await database.get<Clip>('clips').create((clip) => {
                                                        clip.track.set(track);
                                                        clip.title = title ? title : name;
                                                        clip.position = 0;
                                                        clip.color = `#00000000`;
                                                });
                                        }

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
        }, [navigation, handleChooseFile]);

	return null;
}