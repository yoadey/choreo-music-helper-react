import { decodeAudio, parseAudioMetadata, requestPersistentStorage } from '@/helpers/audio'
import { analyzeAudio, chaptersToClips } from '@/helpers/audioImport'
import { showMessage } from '@/helpers/dialogs'
import { selectTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import { createTrackWithClips } from '@/model/trackRepository'
import { FontAwesome6 } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation } from 'expo-router'
import { del, set } from 'idb-keyval'
import { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, Platform, TouchableOpacity } from 'react-native'

const importWebFile = async (asset: DocumentPicker.DocumentPickerAsset) => {
	const blob: Blob = asset.file ?? (await (await fetch(asset.uri)).blob())
	const audio = await analyzeAudio(blob, asset.name, {
		now: Date.now,
		parseMetadata: parseAudioMetadata,
		decode: decodeAudio,
	})
	await requestPersistentStorage()
	await set(audio.key, blob)
	try {
		// Persisted right away by the change subscription in model/index.web
		return await createTrackWithClips(database, audio)
	} catch (error) {
		// Do not leave an orphaned file behind
		await del(audio.key)
		throw error
	}
}

const importNativeFile = (asset: DocumentPicker.DocumentPickerAsset) =>
	createTrackWithClips(database, {
		key: asset.uri,
		title: asset.name,
		lengthMs: 0,
		waveform: [],
		clips: chaptersToClips(undefined, asset.name),
	})

export const importAudioFile = async () => {
	const result = await DocumentPicker.getDocumentAsync({
		type: 'audio/*',
		// Native: the picked content URI is not permanently accessible, so the file is copied
		copyToCacheDirectory: Platform.OS !== 'web',
	})
	if (result.canceled || !result.assets?.length) return

	const asset = result.assets[0]
	const track = Platform.OS === 'web' ? await importWebFile(asset) : await importNativeFile(asset)
	await selectTrack(track)
}

/** Adds the "open file" button to the header. */
export const useNavigationOpenFile = () => {
	const navigation = useNavigation()
	const [importing, setImporting] = useState(false)

	const handleChooseFile = useCallback(() => {
		setImporting(true)
		importAudioFile()
			.catch((error) => {
				console.warn('Import failed', error)
				showMessage(t.importFailed)
			})
			.finally(() => setImporting(false))
	}, [])

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () =>
				importing ? (
					<ActivityIndicator style={{ paddingRight: 20 }} color="#FFFFFF" />
				) : (
					<TouchableOpacity
						onPress={handleChooseFile}
						style={{ paddingRight: 20 }}
						accessibilityRole="button"
						accessibilityLabel="Open audio file"
						testID="open-file"
					>
						<FontAwesome6 name="folder-open" size={22} color="#FFFFFF" solid />
					</TouchableOpacity>
				),
		})
	}, [navigation, handleChooseFile, importing])
}
