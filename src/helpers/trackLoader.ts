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

export type PendingStage = 'none' | 'reading' | 'player'

/**
 * Loads tracks into the player. On the web the audio is stored in IndexedDB and played via an object URL,
 * which is released again when the next track is loaded.
 *
 * Overlapping loads: while reading the file, a newer selection wins. Once a load has reset the player,
 * it is only superseded by a newer load that also reaches the player (or by cancel/unload), so a newer
 * selection whose file is missing does not leave the player and the UI out of sync.
 */
export const createTrackLoader = (deps: TrackLoaderDeps) => {
    let currentUrl: string | undefined
    // Latest selection
    let requested = 0
    // Selection that last reset the player, ownerIsLoad is false after cancel/unload
    let playerOwner = 0
    let ownerIsLoad = false
    let pending: { generation: number; trackId: string; stage: Exclude<PendingStage, 'none'> } | undefined

    const releaseCurrentUrl = () => {
        if (currentUrl) deps.revokeObjectURL(currentUrl)
        currentUrl = undefined
    }

    /** Takes the player away from any running load, nobody owns it afterwards. */
    const disown = () => {
        requested++
        playerOwner = requested
        ownerIsLoad = false
        pending = undefined
    }

    return {
        async load(track: LoadableTrack): Promise<LoadResult> {
            const generation = ++requested
            pending = { generation, trackId: track.id, stage: 'reading' }
            const done = (result: LoadResult) => {
                if (pending?.generation === generation) pending = undefined
                return result
            }
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
                    return done(generation !== requested ? 'superseded' : 'unreadable')
                }
                if (generation !== requested) return done('superseded')
                if (!blob) return done('missing')
                objectUrl = deps.createObjectURL(blob)
                url = objectUrl
            }

            // From here on this load owns the player
            playerOwner = generation
            ownerIsLoad = true
            if (pending?.generation === generation) pending.stage = 'player'
            const ownsPlayer = () => playerOwner === generation

            const superseded = async () => {
                releaseObjectUrl()
                // Cancelled without a newer load: do not leave this (e.g. deleted) track in the player
                if (!ownerIsLoad) await deps.reset()
                return done('superseded')
            }

            try {
                await deps.reset()
                if (!ownsPlayer()) return await superseded()
                await deps.load({ id: track.id, url, title: track.title })
            } catch (error) {
                if (!ownsPlayer()) return await superseded()
                releaseObjectUrl()
                console.warn(`Could not load ${track.uri}`, error)
                // The player was reset, the previous track is not loaded anymore
                releaseCurrentUrl()
                return done('failed')
            }

            if (!ownsPlayer()) return await superseded()
            releaseCurrentUrl()
            currentUrl = objectUrl
            return done('loaded')
        },

        /**
         * Cancels a pending load of the track (e.g. because it is deleted). Returns the stage it was in:
         * "player" means the player was already reset for it, so the previous track is not loaded anymore.
         */
        cancel(trackId: string): PendingStage {
            if (!pending || pending.trackId !== trackId) return 'none'
            const { stage } = pending
            if (stage === 'player') {
                disown()
            } else {
                requested++
                pending = undefined
            }
            return stage
        },

        async unload() {
            disown()
            await deps.reset()
            releaseCurrentUrl()
        },
    }
}
