import type { AnalyzedAudio } from '@/helpers/audioImport'
import { TRANSPARENT } from '@/helpers/audioImport'
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

/** Deletes the track with all its clips and the stored audio file. */
export const deleteTrack = async (
    database: Database,
    track: TrackWithClips,
    removeFile: (key: string) => Promise<void>,
) => {
    await database.write(async () => {
        const clips = await track.clips.fetch()
        await database.batch(...clips.map((clip) => clip.prepareDestroyPermanently()), track.prepareDestroyPermanently())
    })
    await removeFile(track.uri)
}

export const deleteClip = async (database: Database, clip: Clip) => {
    await database.write(async () => {
        await clip.destroyPermanently()
    })
}
