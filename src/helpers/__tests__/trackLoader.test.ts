import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { createTrackLoader } from '../trackLoader'

const track = (id: string) => ({ id, uri: `/audio/${id}.mp3`, title: `Title ${id}` })

const createDeps = () => {
    let counter = 0
    const blobs = new Map<string, Blob>([
        ['/audio/1.mp3', new Blob(['1'])],
        ['/audio/2.mp3', new Blob(['2'])],
    ])
    const resolvers: (() => void)[] = []
    return {
        resolvers,
        deps: {
            platform: 'web' as const,
            getBlob: jest.fn(async (key: string) => blobs.get(key)),
            createObjectURL: jest.fn(() => `blob:${++counter}`),
            revokeObjectURL: jest.fn(),
            reset: jest.fn(async () => undefined),
            load: jest.fn(async (_track: { id: string; url: string; title: string }) => undefined),
        },
    }
}

describe('createTrackLoader', () => {
    let env: ReturnType<typeof createDeps>

    beforeEach(() => {
        env = createDeps()
    })

    it('loads the stored blob with the track id as own property (not as HTTP header)', async () => {
        const loader = createTrackLoader(env.deps)
        await expect(loader.load(track('1'))).resolves.toBe('loaded')
        expect(env.deps.load).toHaveBeenCalledWith({ id: '1', url: 'blob:1', title: 'Title 1' })
    })

    it('revokes the object URL of the previously loaded track', async () => {
        const loader = createTrackLoader(env.deps)
        await loader.load(track('1'))
        await loader.load(track('2'))
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:1')
        expect(env.deps.revokeObjectURL).not.toHaveBeenCalledWith('blob:2')
    })

    it('reports a missing file without touching the player', async () => {
        const loader = createTrackLoader(env.deps)
        await expect(loader.load(track('missing'))).resolves.toBe('missing')
        expect(env.deps.reset).not.toHaveBeenCalled()
        expect(env.deps.createObjectURL).not.toHaveBeenCalled()
    })

    it('only loads the most recently selected track when selections overlap', async () => {
        let releaseFirst: () => void = () => undefined
        env.deps.getBlob.mockImplementationOnce(
            (key: string) =>
                new Promise((resolve) => {
                    releaseFirst = () => resolve(new Blob([key]))
                }),
        )
        const loader = createTrackLoader(env.deps)
        const first = loader.load(track('1'))
        const second = loader.load(track('2'))
        releaseFirst()
        await expect(first).resolves.toBe('superseded')
        await expect(second).resolves.toBe('loaded')
        expect(env.deps.load).toHaveBeenCalledTimes(1)
        expect(env.deps.load).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }))
    })

    it('does not take over when a newer selection finished first while the player was loading', async () => {
        let releaseFirstLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseFirstLoad = () => resolve(undefined)
                }),
        )
        const loader = createTrackLoader(env.deps)
        const first = loader.load(track('1'))
        // Let the first load reach deps.load
        await new Promise((resolve) => setTimeout(resolve, 0))
        await expect(loader.load(track('2'))).resolves.toBe('loaded')
        releaseFirstLoad()
        await expect(first).resolves.toBe('superseded')
        // The URL of the playing track 2 stays valid, the one of track 1 is released
        expect(env.deps.revokeObjectURL).not.toHaveBeenCalledWith('blob:2')
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    })

    it('reports a failed load and releases the new URL', async () => {
        const loader = createTrackLoader(env.deps)
        await loader.load(track('1'))
        env.deps.load.mockRejectedValueOnce(new Error('decode error'))
        await expect(loader.load(track('2'))).resolves.toBe('failed')
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:2')
        // The player was reset, so the URL of the previous track is not needed anymore either
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    })

    it('treats a load that fails because a newer selection interrupted it as superseded', async () => {
        let rejectFirstLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((_resolve, reject) => {
                    rejectFirstLoad = () => reject(new Error('load interrupted'))
                }),
        )
        const loader = createTrackLoader(env.deps)
        const first = loader.load(track('1'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        await loader.load(track('2'))
        rejectFirstLoad()
        await expect(first).resolves.toBe('superseded')
    })

    it('keeps the playing track when the stored file cannot be read', async () => {
        const loader = createTrackLoader(env.deps)
        await loader.load(track('1'))
        env.deps.getBlob.mockRejectedValueOnce(new Error('IndexedDB error'))
        await expect(loader.load(track('2'))).resolves.toBe('unreadable')
        expect(env.deps.reset).toHaveBeenCalledTimes(1)
        expect(env.deps.revokeObjectURL).not.toHaveBeenCalled()
    })

    it('is not superseded by a newer selection that never reaches the player', async () => {
        let releaseFirstLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseFirstLoad = () => resolve(undefined)
                }),
        )
        const loader = createTrackLoader(env.deps)
        const first = loader.load(track('1'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        // The newer selection fails before touching the player
        await expect(loader.load(track('missing'))).resolves.toBe('missing')
        releaseFirstLoad()
        await expect(first).resolves.toBe('loaded')
        expect(env.deps.revokeObjectURL).not.toHaveBeenCalledWith('blob:1')
    })

    it('can cancel a pending load of a track that is being read', async () => {
        let releaseBlob: () => void = () => undefined
        env.deps.getBlob.mockImplementationOnce(
            (key: string) =>
                new Promise((resolve) => {
                    releaseBlob = () => resolve(new Blob([key]))
                }),
        )
        const loader = createTrackLoader(env.deps)
        const pending = loader.load(track('1'))
        expect(loader.cancel('other')).toBe('none')
        expect(loader.cancel('1')).toBe('reading')
        releaseBlob()
        await expect(pending).resolves.toBe('superseded')
        expect(env.deps.reset).not.toHaveBeenCalled()
    })

    it('reports when a cancelled load already reset the player', async () => {
        let releaseLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const loader = createTrackLoader(env.deps)
        const pending = loader.load(track('1'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(loader.cancel('1')).toBe('player')
        releaseLoad()
        await expect(pending).resolves.toBe('superseded')
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    })

    it('never rejects when resetting the player fails for a cancelled load', async () => {
        let releaseLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const loader = createTrackLoader(env.deps)
        const pending = loader.load(track('1'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        loader.cancel('1')
        env.deps.reset.mockImplementationOnce(async () => {
            throw new Error('reset failed')
        })
        releaseLoad()
        await expect(pending).resolves.toBe('superseded')
    })

    it('cancels an older load that owns the player while a newer selection is still reading', async () => {
        let releaseFirstLoad: () => void = () => undefined
        env.deps.load.mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseFirstLoad = () => resolve(undefined)
                }),
        )
        let releaseSecondBlob: () => void = () => undefined
        const loader = createTrackLoader(env.deps)
        const first = loader.load(track('1'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        env.deps.getBlob.mockImplementationOnce(
            (key: string) =>
                new Promise((resolve) => {
                    releaseSecondBlob = () => resolve(new Blob([key]))
                }),
        )
        const second = loader.load(track('2'))
        expect(loader.cancel('1')).toBe('player')
        releaseFirstLoad()
        await expect(first).resolves.toBe('superseded')
        // The newer selection is not affected
        releaseSecondBlob()
        await expect(second).resolves.toBe('loaded')
        expect(env.deps.revokeObjectURL).not.toHaveBeenCalledWith('blob:2')
    })

    it('waits for the player to be prepared and can be cancelled meanwhile', async () => {
        let ready: () => void = () => undefined
        const prepare = jest.fn(() => new Promise<void>((resolve) => (ready = resolve)))
        const loader = createTrackLoader({ ...env.deps, prepare })
        const pending = loader.load(track('1'))
        expect(env.deps.getBlob).not.toHaveBeenCalled()
        expect(loader.cancel('1')).toBe('reading')
        ready()
        await expect(pending).resolves.toBe('superseded')
        expect(env.deps.reset).not.toHaveBeenCalled()
    })

    it('reports an unusable player without touching it', async () => {
        const loader = createTrackLoader({ ...env.deps, prepare: async () => Promise.reject(new Error('not supported')) })
        await expect(loader.load(track('1'))).resolves.toBe('unreadable')
        expect(env.deps.reset).not.toHaveBeenCalled()
    })

    it('uses the uri directly on native platforms', async () => {
        const loader = createTrackLoader({ ...env.deps, platform: 'android' })
        await loader.load({ id: '9', uri: 'file:///song.mp3', title: 'Song' })
        expect(env.deps.getBlob).not.toHaveBeenCalled()
        expect(env.deps.load).toHaveBeenCalledWith({ id: '9', url: 'file:///song.mp3', title: 'Song' })
    })

    it('can unload the current track and release its URL', async () => {
        const loader = createTrackLoader(env.deps)
        await loader.load(track('1'))
        await loader.unload()
        expect(env.deps.revokeObjectURL).toHaveBeenCalledWith('blob:1')
        expect(env.deps.reset).toHaveBeenCalledTimes(2)
    })
})
