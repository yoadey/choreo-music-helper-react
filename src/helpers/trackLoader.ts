export type LoadableTrack = { id: string; uri: string; title: string }

export type PlayerTrack = { id: string; url: string; title: string }

/**
 * - loaded: the track is in the player
 * - missing: the stored audio file does not exist (anymore), the player is unchanged
 * - superseded: a newer selection replaced this one
 * - unreadable: the stored file could not be read, the player is unchanged
 * - failed: the player could not load the file, the player is empty
 */
export type LoadResult = 'loaded' | 'missing' | 'superseded' | 'unreadable' | 'failed'

export type TrackLoaderDeps = {
    platform: string
    getBlob: (key: string) => Promise<Blob | undefined>
    createObjectURL: (blob: Blob) => string
    revokeObjectURL: (url: string) => void
    reset: () => Promise<void>
    load: (track: PlayerTrack) => Promise<void>
}

/**
 * Loads tracks into the player. On the web the audio is stored in IndexedDB and played via an object URL,
 * which is released again when the next track is loaded. Overlapping loads are resolved in favor of the
 * most recent one.
 */
export const createTrackLoader = (deps: TrackLoaderDeps) => {
    let currentUrl: string | undefined
    let generation = 0

    const releaseCurrentUrl = () => {
        if (currentUrl) deps.revokeObjectURL(currentUrl)
        currentUrl = undefined
    }

    return {
        async load(track: LoadableTrack): Promise<LoadResult> {
            const current = ++generation
            const isSuperseded = () => current !== generation
            let url = track.uri
            let objectUrl: string | undefined
            const releaseObjectUrl = () => {
                if (objectUrl) deps.revokeObjectURL(objectUrl)
            }

            if (deps.platform === 'web') {
                let blob: Blob | undefined
                try {
                    blob = await deps.getBlob(track.uri)
                } catch (error) {
                    console.warn(`Could not read ${track.uri}`, error)
                    return isSuperseded() ? 'superseded' : 'unreadable'
                }
                if (isSuperseded()) return 'superseded'
                if (!blob) return 'missing'
                objectUrl = deps.createObjectURL(blob)
                url = objectUrl
            }

            try {
                await deps.reset()
                if (isSuperseded()) {
                    releaseObjectUrl()
                    return 'superseded'
                }
                await deps.load({ id: track.id, url, title: track.title })
            } catch (error) {
                releaseObjectUrl()
                if (isSuperseded()) return 'superseded'
                console.warn(`Could not load ${track.uri}`, error)
                // The player was reset, the previous track is not loaded anymore
                releaseCurrentUrl()
                return 'failed'
            }

            if (isSuperseded()) {
                // A newer selection was loaded in the meantime and owns the player
                releaseObjectUrl()
                return 'superseded'
            }
            releaseCurrentUrl()
            currentUrl = objectUrl
            return 'loaded'
        },

        async unload() {
            generation++
            await deps.reset()
            releaseCurrentUrl()
        },
    }
}
