import type { AnalyzedAudio } from '@/helpers/audioImport'
import { TRANSPARENT } from '@/constants/tokens'
import { Q, type Database, type Model } from '@nozbe/watermelondb'
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

/** A song with its clips as stored in a backup. */
export type TrackData = {
    id: string
    title: string
    uri: string
    length: number
    waveform: string | null
    color: string
    clips: { id: string; title: string; position: number; color: string; speed: number }[]
}

/** All songs with their clips, e.g. for a backup. */
export const readAllTracks = async (database: Database): Promise<TrackData[]> => {
    const tracks = await database.get<TrackWithClips>('tracks').query().fetch()
    return Promise.all(
        tracks.map(async (track) => ({
            id: track.id,
            title: track.title,
            uri: track.uri,
            length: track.length,
            waveform: track.waveform,
            color: track.color,
            clips: (await track.clips.fetch())
                .map((clip) => ({
                    id: clip.id,
                    title: clip.title,
                    position: clip.position,
                    color: clip.color,
                    speed: clip.speed ?? 1,
                }))
                .sort((a, b) => a.position - b.position),
        })),
    )
}

/**
 * Restores songs from a backup in one batch. Songs that exist (same id) are replaced including their clips,
 * all other songs stay. The ids are kept, so the loop markers of the restored clips stay valid.
 */
export const restoreTracks = async (database: Database, data: readonly TrackData[]) =>
    database.write(async () => {
        const tracks = database.get<TrackWithClips>('tracks')
        const clips = database.get<Clip>('clips')
        const existingTracks = new Map(
            (await tracks.query(Q.where('id', Q.oneOf(data.map((t) => t.id)))).fetch()).map((t) => [t.id, t]),
        )
        // The clips of the restored songs and clips with the ids of the backup (also of another song, whose id
        // must not be reused)
        const existingClips = new Map(
            (
                await clips
                    .query(
                        Q.or(
                            Q.where('track_id', Q.oneOf(data.map((t) => t.id))),
                            Q.where('id', Q.oneOf(data.flatMap((t) => t.clips.map((c) => c.id)))),
                        ),
                    )
                    .fetch()
            ).map((c) => [c.id, c]),
        )
        const operations: Model[] = []

        for (const item of data) {
            const setFields = (t: TrackWithClips) => {
                t.title = item.title
                t.uri = item.uri
                t.length = item.length
                t.waveform = item.waveform
                t.color = item.color
            }
            const existing = existingTracks.get(item.id)
            let track: TrackWithClips
            if (existing) {
                track = existing.prepareUpdate(setFields)
            } else {
                track = tracks.prepareCreate((t) => {
                    t._raw.id = item.id
                    setFields(t)
                })
            }
            operations.push(track)

            const keep = new Set<string>()
            for (const c of item.clips) {
                const setClip = (clip: Clip) => {
                    clip.title = c.title
                    clip.position = c.position
                    clip.color = c.color
                    clip.speed = c.speed
                }
                const existingClip = existingClips.get(c.id)
                if (existingClip && existingClip.track.id === item.id) {
                    keep.add(c.id)
                    operations.push(existingClip.prepareUpdate(setClip))
                } else {
                    operations.push(
                        clips.prepareCreate((clip) => {
                            // A clip id of another song gets a new id
                            if (!existingClip) clip._raw.id = c.id
                            clip.track.set(track)
                            setClip(clip)
                        }),
                    )
                }
            }
            if (existing) {
                for (const clip of existingClips.values()) {
                    if (clip.track.id === item.id && !keep.has(clip.id)) {
                        operations.push(clip.prepareDestroyPermanently())
                    }
                }
            }
        }
        await database.batch(...operations)
    })
