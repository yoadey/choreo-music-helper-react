import { releaseTrack } from '@/helpers/player'
import { database, flushDatabase } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { deleteTrack } from '@/model/trackRepository'
import { del } from 'idb-keyval'
import { Platform } from 'react-native'

const removeStoredFile = async (key: string) => {
    if (Platform.OS === 'web') await del(key)
}

/**
 * Deletes the song. It is only released from the player (stopped, unloaded, its loop removed) once it is
 * actually deleted; a load of it that finishes meanwhile is released as well.
 */
export const removeTrack = async (track: TrackWithClips) => {
    await deleteTrack(database, track, removeStoredFile, flushDatabase)
    await releaseTrack(track.id)
}
