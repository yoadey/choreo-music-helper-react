import { useAudioFilesStore } from '@/store/store';
import { get, keys } from 'idb-keyval';
import { useEffect } from 'react';

const IDB_UPDATE_EVENT = 'idb-update';

export const useStoredAudioFiles = () => {
	const { audioFiles, setAudioFiles } = useAudioFilesStore();

	async function loadKeys() {
		const allKeys = await keys();
		for (const key of allKeys) {
			const id = key.toString();
			if (!audioFiles.has(id)) {
				const blob = await get<Blob>(id);
				if (blob) {
					const url = URL.createObjectURL(blob);
					audioFiles.set(id, url);
				}
			}
		}
		setAudioFiles(audioFiles);
	}

	useEffect(() => {
		loadKeys(); // initialer Ladeaufruf

		const onUpdate = () => {
			loadKeys();
		};

		window.addEventListener(IDB_UPDATE_EVENT, onUpdate);

		return () => {
			window.removeEventListener(IDB_UPDATE_EVENT, onUpdate);
		};
	}, []);

	return audioFiles
}
