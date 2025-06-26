import { get, keys } from 'idb-keyval';
import { useEffect, useState } from 'react';


const IDB_UPDATE_EVENT = 'idb-update';

let sharedData: Map<String, String> | null = null;
let loadingPromise: Promise<Map<String, String>> | null = null;

export const useStoredAudioFiles = () => {
	const [audioFiles, setAudioFiles] = useState<Map<String, String>>(new Map());


	async function loadKeys() {
		const allKeys = await keys();
		const loaded = new Map<String, String>();
		for (const key of allKeys) {
			const name = key.toString();
			const blob = await get<Blob>(name);
			if (blob) {
				const url = URL.createObjectURL(blob);
				loaded.set(name, url);
			}
		}
		setAudioFiles(loaded);
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
