import { decodeAudio, parseAudioMetadata, requestPersistentStorage } from '@/helpers/audio'
import { analyzeAudio, chaptersToClips } from '@/helpers/audioImport'
import { selectTrack } from '@/helpers/player'
import { t } from '@/i18n'
import { database, flushDatabase, markSaveFailureReported, withOwnSaveFailureReport } from '@/model/index.web'
import { isQuotaError } from '@/model/saveErrors'
import { createTrackWithClips, deleteTrack } from '@/model/trackRepository'
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
	// A failed save is reported as failed import, not additionally by the background save
	return withOwnSaveFailureReport(() => createAndSave(audio))
}

const createAndSave = async (audio: Awaited<ReturnType<typeof analyzeAudio>>) => {
	let track: Awaited<ReturnType<typeof createTrackWithClips>>
	try {
		track = await createTrackWithClips(database, audio)
	} catch (error) {
		// Do not leave an orphaned file behind
		await del(audio.key)
		throw error
	}
	try {
		// Only an import that was written to IndexedDB is kept (otherwise it is gone after a reload)
		await flushDatabase()
	} catch (error) {
		// Reported as failed import; saving the clean up below may fail as well
		markSaveFailureReported()
		await deleteTrack(database, track, del).catch((cleanupError) => {
			console.warn('Could not remove the import that was not saved', cleanupError)
		})
		throw error
	}
	// Not awaited: some browsers ask the user and may never answer
	requestPersistentStorage().catch(() => undefined)
	return track
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
export const importErrorMessage = (error: unknown) => (isQuotaError(error) ? t.storageFull : t.importFailed)

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
