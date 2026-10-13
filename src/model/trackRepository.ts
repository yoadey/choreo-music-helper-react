import type { AnalyzedAudio } from '@/helpers/audioImport'
import { TRANSPARENT } from '@/constants/tokens'
import type { Database } from '@nozbe/watermelondb'
import Clip from './clip'
import TrackWithClips from './track'

/** Creates the track and all clips of an imported file in one batch. */
export const createTrackWithClips = async (database: Database, audio: Omit<AnalyzedAudio, 'name'>) =>
    database.write(async () => {
        const tracks = database.get<TrackWithClips>('tracks')
        const clips = database.get<Clip>('clips')
        const track = tracks.prepareCreate((t) => {
            t.title = audio.title
            t.uri = audio.key
            t.length = audio.lengthMs
            t.waveform = JSON.stringify(audio.waveform)
            t.color = TRANSPARENT
        })
        const preparedClips = audio.clips.map((c) =>
            clips.prepareCreate((clip) => {
                clip.track.set(track)
                clip.title = c.title
                clip.position = c.position
                clip.color = c.color
                clip.speed = 1
            }),
        )
        await database.batch(track, ...preparedClips)
        return track
    })

/** Creates a clip with the default values (no color, normal speed). */
export const createClip = async (
    database: Database,
    track: TrackWithClips,
    { title, position }: { title: string; position: number },
) =>
    database.write(async () =>
        database.get<Clip>('clips').create((clip) => {
            clip.track.set(track)
            clip.title = title
            clip.position = position
            clip.color = TRANSPARENT
            clip.speed = 1
        }),
    )

/**
 * Deletes the track with all its clips and the stored audio file. The file is only removed once the delete
 * is persisted (otherwise the song could come back without its file). The song is deleted even if the file
 * cannot be removed (it is not referenced anymore), so that is not reported as a failure.
 */
export const deleteTrack = async (
    database: Database,
    track: TrackWithClips,
    removeFile: (key: string) => Promise<void>,
    persist: () => Promise<void> = async () => undefined,
) => {
    await database.write(async () => {
        const clips = await track.clips.fetch()
        await database.batch(...clips.map((clip) => clip.prepareDestroyPermanently()), track.prepareDestroyPermanently())
    })
    await persist()
    try {
        await removeFile(track.uri)
    } catch (error) {
        console.warn(`Could not remove the audio file ${track.uri}`, error)
    }
}

export const deleteClip = async (database: Database, clip: Clip) => {
    await database.write(async () => {
        await clip.destroyPermanently()
    })
}
