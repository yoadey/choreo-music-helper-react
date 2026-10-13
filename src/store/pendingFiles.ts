import { del } from 'idb-keyval'
import { Platform } from 'react-native'
import { createMMKV } from 'react-native-mmkv'

// Own storage: changes must not trigger the listeners of the playback preferences
const storage = createMMKV({ id: 'pending-files-storage' })
const KEY = 'pendingAudioFiles'

/**
 * Stored audio files whose import or delete is not finished yet. If the app is closed or saving fails in
 * between, the file is cleaned up at a later start when no song refers to it (see removeOrphanedAudioFiles).
 */
export const getPendingFiles = (): string[] => {
    try {
        const value: unknown = JSON.parse(storage.getString(KEY) ?? '[]')
        return Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : []
    } catch {
        return []
    }
}

const setPendingFiles = (keys: string[]) => {
    try {
        if (keys.length === 0) storage.remove(KEY)
        else storage.set(KEY, JSON.stringify(keys))
    } catch (error) {
        // E.g. the storage is full or blocked: only the clean up of an interrupted import/delete is lost
        console.warn('Could not remember the pending audio files', error)
    }
}

export const addPendingFile = (key: string) => {
    const keys = getPendingFiles()
    if (!keys.includes(key)) setPendingFiles([...keys, key])
}

export const removePendingFile = (key: string) => removePendingFiles([key])

export const removePendingFiles = (done: string[]) => {
    setPendingFiles(getPendingFiles().filter((key) => !done.includes(key)))
}

/** Removes a stored audio file (web) and forgets it as pending. */
export const removeStoredFile = async (key: string) => {
    if (Platform.OS === 'web') await del(key)
    removePendingFile(key)
}
