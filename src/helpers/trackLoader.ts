export type LoadableTrack = { id: string; uri: string; title: string }

export type PlayerTrack = { id: string; url: string; title: string }

export type LoadResult = 'loaded' | 'missing' | 'superseded'

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
            let url = track.uri
            let objectUrl: string | undefined

            if (deps.platform === 'web') {
                const blob = await deps.getBlob(track.uri)
                if (current !== generation) return 'superseded'
                if (!blob) return 'missing'
                objectUrl = deps.createObjectURL(blob)
                url = objectUrl
            }

            await deps.reset()
            if (current !== generation) {
                if (objectUrl) deps.revokeObjectURL(objectUrl)
                return 'superseded'
            }
            await deps.load({ id: track.id, url, title: track.title })
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
