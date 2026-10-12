import { decodeAudio, parseAudioMetadata, requestPersistentStorage } from '@/helpers/audio'
import { analyzeAudio, chaptersToClips } from '@/helpers/audioImport'
import { selectTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import { createTrackWithClips } from '@/model/trackRepository'
import * as DocumentPicker from 'expo-document-picker'
import { del, set } from 'idb-keyval'
import { Platform } from 'react-native'

const importWebFile = async (asset: DocumentPicker.DocumentPickerAsset) => {
	const blob: Blob = asset.file ?? (await (await fetch(asset.uri)).blob())
	const audio = await analyzeAudio(blob, asset.name, {
		now: Date.now,
		parseMetadata: parseAudioMetadata,
		decode: decodeAudio,
		untitledChapter: t.numberedClip,
	})
	await set(audio.key, blob)
	try {
		// Persisted right away by the change subscription in model/index.web
		const track = await createTrackWithClips(database, audio)
		// Not awaited: some browsers ask the user and may never answer
		requestPersistentStorage().catch(() => undefined)
		return track
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

/** Message for a failed import */
export const importErrorMessage = (error: unknown) =>
	error instanceof Error && error.name === 'QuotaExceededError' ? t.storageFull : t.importFailed

/**
 * Lets the user pick an audio file, imports it and selects it. onStart is called once a file was picked:
 * some browsers never report a cancelled picker, so nothing may wait for the picker to close.
 */
export const importAudioFile = async (onStart?: () => void) => {
	const result = await DocumentPicker.getDocumentAsync({
		type: 'audio/*',
		// Native: the picked content URI is not permanently accessible, so the file is copied
		copyToCacheDirectory: Platform.OS !== 'web',
	})
	if (result.canceled || !result.assets?.length) return

	const asset = result.assets[0]
	onStart?.()
	try {
		const track = Platform.OS === 'web' ? await importWebFile(asset) : await importNativeFile(asset)
		await selectTrack(track)
	} finally {
		// On the web the picker creates an object URL for the file, which keeps the file in memory
		if (Platform.OS === 'web' && asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri)
	}
}
