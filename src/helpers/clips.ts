import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { deleteClip } from '@/model/trackRepository'
import { clearLoopMarkersForClip } from '@/store/playbackState'

/** Deletes the clip; its loop markers are only removed once the clip is actually deleted. */
export const removeClip = async (clip: Clip) => {
    await deleteClip(database, clip)
    clearLoopMarkersForClip(clip.id)
}
