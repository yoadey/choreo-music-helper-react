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
    // Load that currently owns the player, 0 after cancel/unload
    let playerOwner = 0
    // Loads in progress and loads cancelled while reading their file
    const inFlight = new Map<number, { trackId: string; stage: Exclude<PendingStage, 'none'> }>()
    const cancelled = new Set<number>()

    const releaseCurrentUrl = () => {
        if (currentUrl) deps.revokeObjectURL(currentUrl)
        currentUrl = undefined
    }

    return {
        async load(track: LoadableTrack): Promise<LoadResult> {
            const generation = ++requested
            inFlight.set(generation, { trackId: track.id, stage: 'reading' })
            const done = (result: LoadResult) => {
                inFlight.delete(generation)
                cancelled.delete(generation)
                return result
            }
            const isOutdated = () => generation !== requested || cancelled.has(generation)
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
                    return done(isOutdated() ? 'superseded' : 'unreadable')
                }
                if (isOutdated()) return done('superseded')
                if (!blob) return done('missing')
                objectUrl = deps.createObjectURL(blob)
                url = objectUrl
            }

            // From here on this load owns the player
            playerOwner = generation
            inFlight.set(generation, { trackId: track.id, stage: 'player' })
            const ownsPlayer = () => playerOwner === generation

            const superseded = async () => {
                releaseObjectUrl()
                // Cancelled without a newer load: do not leave this (e.g. deleted) track in the player
                if (playerOwner === 0) await deps.reset()
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
         * Cancels all loads of the track that are in progress (e.g. because it is deleted). Returns "player"
         * if one of them already owns the player (so the previous track is not loaded anymore), "reading"
         * if a load was still reading the file, otherwise "none". Loads of other tracks are not affected.
         */
        cancel(trackId: string): PendingStage {
            let result: PendingStage = 'none'
            for (const [generation, load] of inFlight) {
                if (load.trackId !== trackId) continue
                if (load.stage === 'reading') {
                    cancelled.add(generation)
                    if (result === 'none') result = 'reading'
                } else if (playerOwner === generation) {
                    playerOwner = 0
                    result = 'player'
                }
            }
            return result
        },

        async unload() {
            playerOwner = 0
            await deps.reset()
            releaseCurrentUrl()
        },
    }
}
