import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('idb-keyval', () => ({ get: jest.fn(async () => new Blob(['audio'])) }))
jest.mock('@/helpers/dialogs', () => ({ showMessage: jest.fn(), confirmAction: jest.fn() }))

type Modules = {
    player: typeof import('../player')
    store: typeof import('@/store/store')
    prefs: typeof import('@/store/playbackState')
    dialogs: { showMessage: jest.Mock }
    trackPlayer: typeof import('@/testUtils/trackPlayerMock')
    i18n: typeof import('@/i18n')
}

let m: Modules

const track = (id: string) => ({ id, uri: `/audio/${id}.mp3`, title: `Song ${id}` }) as never

beforeEach(() => {
    jest.resetModules()
    localStorage.clear()
    let counter = 0
    URL.createObjectURL = jest.fn(() => `blob:${++counter}`)
    URL.revokeObjectURL = jest.fn()
    m = {
        player: require('../player'),
        store: require('@/store/store'),
        prefs: require('@/store/playbackState'),
        dialogs: require('@/helpers/dialogs'),
        trackPlayer: require('react-native-track-player'),
        i18n: require('@/i18n'),
    }
    m.trackPlayer.resetTrackPlayerMock()
})

describe('selectTrack', () => {
    it('waits for the player setup before touching the player', async () => {
        await m.player.selectTrack(track('1'))
        const setupOrder = (m.trackPlayer.default.setupPlayer as unknown as jest.Mock).mock.invocationCallOrder[0]
        const resetOrder = (m.trackPlayer.default.reset as unknown as jest.Mock).mock.invocationCallOrder[0]
        expect(setupOrder).toBeDefined()
        expect(setupOrder).toBeLessThan(resetOrder)
    })

    it('does not reload the current song when it is selected again (playback continues)', async () => {
        await m.player.selectTrack(track('1'))
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await expect(m.player.selectTrack(track('1'))).resolves.toBe(true)
        expect(reset).not.toHaveBeenCalled()
    })

    it('the last selection wins, also when the current song was selected again right before', async () => {
        await m.player.selectTrack(track('1'))
        const again = m.player.selectTrack(track('1'))
        const other = m.player.selectTrack(track('2'))
        await Promise.all([again, other])
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
    })

    it('makes the track current after it was loaded', async () => {
        await expect(m.player.selectTrack(track('1'))).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
        expect(m.prefs.getLastTrack()).toBe('1')
    })

    it('keeps the loop of the current song when another song could not be loaded', async () => {
        await m.player.selectTrack(track('1'))
        m.prefs.setLoopStart({ id: 'a' })
        m.prefs.setLoopEnd({ id: 'b' })
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('decode error')
        })
        await m.player.selectTrack(track('2'))
        await m.player.selectTrack(track('1'))
        expect(m.prefs.getLoopStartId()).toBe('a')
    })

    it('never rejects and shows a message when the player cannot load the file', async () => {
        await m.player.selectTrack(track('1'))
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('decode error')
        })
        await expect(m.player.selectTrack(track('2'))).resolves.toBe(false)
        expect(m.dialogs.showMessage).toHaveBeenCalledWith(m.i18n.t.loadFailed)
        // The player was reset, so no track is shown as current anymore
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toBeNull()
    })

    it('keeps the current track when the file of the selected track is missing', async () => {
        await m.player.selectTrack(track('1'))
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => undefined)
        await expect(m.player.selectTrack(track('2'))).resolves.toBe(false)
        expect(m.dialogs.showMessage).toHaveBeenCalledWith(m.i18n.t.fileMissing)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
    })

    it('keeps the current track when the stored file cannot be read', async () => {
        await m.player.selectTrack(track('1'))
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => {
            throw new Error('IndexedDB error')
        })
        await expect(m.player.selectTrack(track('2'))).resolves.toBe(false)
        expect(m.dialogs.showMessage).toHaveBeenCalledWith(m.i18n.t.loadFailed)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
    })

    it('does not show messages for silent restores', async () => {
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('decode error')
        })
        await expect(m.player.selectTrack(track('1'), { silent: true })).resolves.toBe(false)
        expect(m.dialogs.showMessage).not.toHaveBeenCalled()
    })
})

describe('releaseTrack (before deleting a track)', () => {
    it('pauses before unloading, so the player reports the paused state', async () => {
        await m.player.selectTrack(track('1'))
        const pause = m.trackPlayer.default.pause as unknown as jest.Mock
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await m.player.releaseTrack('1')
        expect(pause).toHaveBeenCalled()
        expect(pause.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0])
    })

    it('can keep the loop and the last song (until the delete succeeded)', async () => {
        await m.player.selectTrack(track('1'))
        m.prefs.setLoopStart({ id: 'a' })
        await m.player.releaseTrack('1', { keepPreferences: true })
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toBeNull()
        expect(m.prefs.getLastTrack()).toBe('1')
        expect(m.prefs.getLoopStartId()).toBe('a')
    })

    it('unloads the current track', async () => {
        await m.player.selectTrack(track('1'))
        await m.player.releaseTrack('1')
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toBeNull()
        expect(m.prefs.getLastTrack()).toBeUndefined()
    })

    it('keeps another current track', async () => {
        await m.player.selectTrack(track('1'))
        await m.player.releaseTrack('2')
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
    })

    it('prevents a track that is still loading from becoming current after it was deleted', async () => {
        await m.player.selectTrack(track('1'))
        const { get } = require('idb-keyval') as { get: jest.Mock }
        let releaseBlob: () => void = () => undefined
        get.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    releaseBlob = () => resolve(new Blob(['audio']))
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await m.player.releaseTrack('2')
        releaseBlob()
        await expect(pending).resolves.toBe(false)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
    })

    it('clears the current track when the deleted track had already reset the player', async () => {
        await m.player.selectTrack(track('1'))
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        await m.player.releaseTrack('2')
        releaseLoad()
        await expect(pending).resolves.toBe(false)
        // Track 1 is not in the player anymore
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toBeNull()
    })

    it('keeps a newer selection that is loading when the current track is deleted', async () => {
        await m.player.selectTrack(track('1'))
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        await m.player.releaseTrack('1')
        releaseLoad()
        await expect(pending).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
        expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:2')
    })
})

describe('restoreLastTrack', () => {
    const databaseWith = (fetch: () => Promise<unknown[]>) =>
        ({ get: () => ({ query: () => ({ fetch }) }) }) as never

    it('restores the last track', async () => {
        m.prefs.setLastTrack('1')
        await m.player.restoreLastTrack(databaseWith(async () => [track('1')]))
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
    })

    it('forgets the last track when it was deleted', async () => {
        m.prefs.setLastTrack('1')
        await m.player.restoreLastTrack(databaseWith(async () => []))
        expect(m.prefs.getLastTrack()).toBeUndefined()
    })

    it('does not replace a song the user selected while the app was starting', async () => {
        m.prefs.setLastTrack('1')
        let resolveFetch: (tracks: unknown[]) => void = () => undefined
        const restore = m.player.restoreLastTrack(
            databaseWith(() => new Promise((resolve) => (resolveFetch = resolve))),
        )
        const selected = m.player.selectTrack(track('2'))
        resolveFetch([track('1')])
        await restore
        await expect(selected).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
    })

    it('does not replace a song the user selected before the player was ready', async () => {
        m.prefs.setLastTrack('1')
        const selected = m.player.selectTrack(track('2'))
        await m.player.restoreLastTrack(databaseWith(async () => [track('1')]))
        await expect(selected).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
    })

    it('forgets the last track when its audio file is missing, so its loop is not shown as active', async () => {
        m.prefs.setLastTrack('1')
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => undefined)
        await m.player.restoreLastTrack(databaseWith(async () => [track('1')]))
        expect(m.prefs.getLastTrack()).toBeUndefined()
    })

    it('keeps the last track (and its loop) when its file cannot be read this time', async () => {
        m.prefs.setLastTrack('1')
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => {
            throw new Error('Connection to Indexed Database server lost')
        })
        await m.player.restoreLastTrack(databaseWith(async () => [track('1')]))
        expect(m.prefs.getLastTrack()).toBe('1')
    })

    it('keeps the last track when the database cannot be read this time', async () => {
        m.prefs.setLastTrack('1')
        await m.player.restoreLastTrack(
            databaseWith(async () => {
                throw new Error('IndexedDB blocked')
            }),
        )
        expect(m.prefs.getLastTrack()).toBe('1')
    })
})

describe('after the player dropped the song (error)', () => {
    it('continues at the position of the error when the song is selected again in the list', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(120)
        await m.player.selectTrack(track('1'))
        expect(m.trackPlayer.default.seekTo).toHaveBeenLastCalledWith(120)
    })

    it('shows the position after loading the song again (not 0:00 of the reloaded player)', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(90)
        usePlayerProgressStore.setState({ position: 0, duration: 0 })
        m.trackPlayer.playerState.duration = 200
        await m.player.ensureTrackLoaded()
        expect(usePlayerProgressStore.getState().position).toBe(90)
    })

    it('does not unload a song selected while the deleted song is being released', async () => {
        await m.player.selectTrack(track('1'))
        let releasePause: () => void = () => undefined
        ;(m.trackPlayer.default.pause as unknown as jest.Mock).mockImplementationOnce(
            () => new Promise<undefined>((resolve) => (releasePause = () => resolve(undefined))),
        )
        const releasing = m.player.releaseTrack('1')
        await m.player.selectTrack(track('2'))
        releasePause()
        await releasing
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
        expect(m.trackPlayer.playerState.activeTrack?.id).toBe('2')
    })

    it('loads the song only once when several actions need it at the same time (none is dropped)', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        const create = jest.fn(async () => undefined)
        await Promise.all([
            m.player.playCurrentTrack(),
            m.player.addClipAtCurrentPosition(track('1'), create),
            m.player.selectTrack(track('1')),
        ])
        expect(reset).toHaveBeenCalledTimes(1)
        expect(m.trackPlayer.default.play).toHaveBeenCalled()
        expect(create).toHaveBeenCalledWith(track('1'), 30)
    })

    it('does not load the dropped song again while the user selected another song (the selection wins)', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        const { get } = require('idb-keyval') as { get: jest.Mock }
        let releaseBlob: () => void = () => undefined
        get.mockImplementationOnce(
            () => new Promise((resolve) => (releaseBlob = () => resolve(new Blob(['audio'])))),
        )
        const selecting = m.player.selectTrack(track('2'))
        const create = jest.fn(async () => undefined)
        await m.player.addClipAtCurrentPosition(track('1'), create)
        releaseBlob()
        await expect(selecting).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('2'))
        // The clip was added to the shown (dropped) song at its position, without loading it
        expect(create).toHaveBeenCalledWith(track('1'), 30)
    })

    it('makes the dropped song current again when it is selected while another song loads', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () => new Promise<undefined>((resolve) => (releaseLoad = () => resolve(undefined))),
        )
        const other = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        const again = m.player.selectTrack(track('1'))
        releaseLoad()
        await Promise.all([other, again])
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
        expect(m.trackPlayer.playerState.activeTrack?.id).toBe('1')
    })

    it('stays dropped when the player fails again while the song is loaded again', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        ;(m.trackPlayer.default.seekTo as unknown as jest.Mock).mockImplementationOnce(async () => {
            m.player.markPlayerFailed(0)
        })
        await m.player.ensureTrackLoaded()
        expect(m.player.isTrackDropped()).toBe(true)
    })

    it('continues at a position that was moved while the song was loaded again (e.g. Stop)', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        const reloading = m.player.ensureTrackLoaded()
        m.player.moveDroppedPosition(5)
        await reloading
        expect(m.trackPlayer.default.seekTo).toHaveBeenLastCalledWith(5)
    })

    it('publishes a moved position of the dropped song', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        m.player.moveDroppedPosition(5)
        expect(usePlayerProgressStore.getState().position).toBe(5)
    })

    it('does not start the song when another song was selected while it was loaded again', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        let releaseSeek: () => void = () => undefined
        ;(m.trackPlayer.default.seekTo as unknown as jest.Mock).mockImplementationOnce(
            () => new Promise<undefined>((resolve) => (releaseSeek = () => resolve(undefined))),
        )
        const { get } = require('idb-keyval') as { get: jest.Mock }
        let releaseBlob: () => void = () => undefined
        const playing = m.player.playCurrentTrack()
        await new Promise((resolve) => setTimeout(resolve, 0))
        get.mockImplementationOnce(() => new Promise((resolve) => (releaseBlob = () => resolve(new Blob(['audio'])))))
        const other = m.player.selectTrack(track('2'))
        releaseSeek()
        await playing
        releaseBlob()
        await other
        expect(m.trackPlayer.default.play).not.toHaveBeenCalled()
    })

    it('is not dropped without a current song', async () => {
        expect(m.player.isTrackDropped()).toBe(false)
    })

    it('waits for the jump back to the position of the error before using the song', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        let releaseSeek: () => void = () => undefined
        ;(m.trackPlayer.default.seekTo as unknown as jest.Mock).mockImplementationOnce(
            (...args: unknown[]) =>
                new Promise<undefined>((resolve) => {
                    releaseSeek = () => {
                        m.trackPlayer.playerState.position = args[0] as number
                        resolve(undefined)
                    }
                }),
        )
        const playing = m.player.playCurrentTrack()
        await new Promise((resolve) => setTimeout(resolve, 0))
        const create = jest.fn(async () => undefined)
        const adding = m.player.addClipAtCurrentPosition(track('1'), create)
        await new Promise((resolve) => setTimeout(resolve, 0))
        releaseSeek()
        await Promise.all([playing, adding])
        expect(create).toHaveBeenCalledWith(track('1'), 150)
    })

    it('never rejects when jumping back after loading the song again fails', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        ;(m.trackPlayer.default.seekTo as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('The player is not set up')
        })
        await expect(m.player.selectTrack(track('1'))).resolves.toBe(true)
    })

    it('the last selection wins also between reloads of the dropped song', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        const { get } = require('idb-keyval') as { get: jest.Mock }
        const blobs: (() => void)[] = []
        get.mockImplementation(
            () => new Promise((resolve) => blobs.push(() => resolve(new Blob(['audio'])))),
        )
        const reload = m.player.playCurrentTrack()
        const other = m.player.selectTrack(track('2'))
        const again = m.player.selectTrack(track('1'))
        get.mockImplementation(async () => new Blob(['audio']))
        blobs.forEach((release) => release())
        await Promise.all([reload, other, again])
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
        expect(m.trackPlayer.playerState.activeTrack?.id).toBe('1')
    })

    it('forgets the error position when another song was loaded (also while the reload was cancelled)', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        const reload = m.player.playCurrentTrack()
        await m.player.selectTrack(track('2'))
        await reload
        expect(m.player.isTrackDropped()).toBe(false)
    })

    it('can move the error position (e.g. Stop) without loading the song', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        m.player.moveDroppedPosition(5)
        await m.player.ensureTrackLoaded()
        expect(m.trackPlayer.default.seekTo).toHaveBeenLastCalledWith(5)
    })

    it('keeps the position of the first error (a later error of the empty player reports 0)', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(70)
        m.player.markPlayerFailed(0)
        await m.player.ensureTrackLoaded()
        expect(m.trackPlayer.default.seekTo).toHaveBeenLastCalledWith(70)
    })

    it('does not start playing when the user paused while the song was loaded again', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(30)
        const playing = m.player.playCurrentTrack()
        m.player.cancelPendingPlay()
        await playing
        expect(m.trackPlayer.default.play).not.toHaveBeenCalled()
    })

    it('reloads the song when it is selected again', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(10)
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await expect(m.player.selectTrack(track('1'))).resolves.toBe(true)
        expect(reset).toHaveBeenCalled()
        // Loaded again: selecting it once more keeps it playing
        reset.mockClear()
        await m.player.selectTrack(track('1'))
        expect(reset).not.toHaveBeenCalled()
    })

    it('reloads the song on Play and continues at the position of the error', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(150)
        // The emptied player reports 0, e.g. after a refresh when the app became visible again
        usePlayerProgressStore.setState({ position: 0, duration: 0 })
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await m.player.playCurrentTrack()
        expect(reset).toHaveBeenCalled()
        expect(m.trackPlayer.default.seekTo).toHaveBeenLastCalledWith(150)
        expect(m.trackPlayer.default.play).toHaveBeenCalled()
    })

    it('adds a clip at the position of the error, not at 0:00 of the emptied player', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(42)
        m.trackPlayer.playerState.position = 0
        const create = jest.fn(async () => undefined)
        await m.player.addClipAtCurrentPosition(track('1'), create)
        expect(create).toHaveBeenCalledWith(track('1'), 42)
    })

    it('reloads the song when it failed while the newly selected song could not be loaded', async () => {
        await m.player.selectTrack(track('1'))
        const { get } = require('idb-keyval') as { get: jest.Mock }
        get.mockImplementationOnce(async () => {
            // The playing song fails while the file of the new selection is read
            m.player.markPlayerFailed(5)
            return undefined
        })
        await expect(m.player.selectTrack(track('2'))).resolves.toBe(false)
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await m.player.selectTrack(track('1'))
        expect(reset).toHaveBeenCalled()
    })

    it('does not reload after another song was loaded meanwhile', async () => {
        await m.player.selectTrack(track('1'))
        m.player.markPlayerFailed(5)
        await m.player.selectTrack(track('2'))
        const reset = m.trackPlayer.default.reset as unknown as jest.Mock
        reset.mockClear()
        await m.player.playCurrentTrack()
        expect(reset).not.toHaveBeenCalled()
    })
})

describe('playCurrentTrack', () => {
    it('starts playing only after a pending load finished, so the player state ends as "playing"', async () => {
        await m.player.selectTrack(track('1'))
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        const playing = m.player.playCurrentTrack()
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(m.trackPlayer.default.play).not.toHaveBeenCalled()
        releaseLoad()
        await pending
        await playing
        expect(m.trackPlayer.default.play).toHaveBeenCalled()
    })

    it('plays right away when nothing is loading (still inside the click, which browsers require)', async () => {
        await m.player.selectTrack(track('1'))
        const playing = m.player.playCurrentTrack()
        expect(m.trackPlayer.default.play).toHaveBeenCalled()
        await playing
    })

    it('does not show "playing" when the browser refused the delayed start', async () => {
        await m.player.selectTrack(track('1'))
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        // The web player sets "play when ready" and only logs the refusal (NotAllowedError)
        ;(m.trackPlayer.default.play as unknown as jest.Mock).mockImplementationOnce(async () => {
            m.trackPlayer.playerState.playWhenReady = true
            m.trackPlayer.playerState.state = 'ready'
        })
        const playing = m.player.playCurrentTrack()
        releaseLoad()
        await pending
        await playing
        expect(m.trackPlayer.playerState.playWhenReady).toBe(false)
    })

    it('does not show "playing" when the browser refused the start (e.g. media key without user activation)', async () => {
        await m.player.selectTrack(track('1'))
        ;(m.trackPlayer.default.play as unknown as jest.Mock).mockImplementationOnce(async () => {
            m.trackPlayer.playerState.playWhenReady = true
            m.trackPlayer.playerState.state = 'paused'
        })
        await m.player.playCurrentTrack()
        expect(m.trackPlayer.playerState.playWhenReady).toBe(false)
    })

    it('never rejects, e.g. before the player is set up', async () => {
        await m.player.selectTrack(track('1'))
        ;(m.trackPlayer.default.play as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('The player is not set up')
        })
        await expect(m.player.playCurrentTrack()).resolves.toBeUndefined()
    })

    it('can skip the start when another song is loading (e.g. restarting a loop)', async () => {
        await m.player.selectTrack(track('1'))
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        await m.player.playCurrentTrack({ unlessLoading: true })
        releaseLoad()
        await pending
        expect(m.trackPlayer.default.play).not.toHaveBeenCalled()
    })

    it('does nothing without a loaded song, e.g. after the current song was deleted', async () => {
        await m.player.selectTrack(track('1'))
        await m.player.releaseTrack('1')
        await m.player.playCurrentTrack()
        expect(m.trackPlayer.default.play).not.toHaveBeenCalled()
    })
})

describe('addClipAtCurrentPosition', () => {
    const createClip = jest.fn(async () => undefined)

    it('shows a message instead of failing silently when the clip cannot be saved', async () => {
        await m.player.selectTrack(track('1'))
        await expect(
            m.player.addClipAtCurrentPosition(track('1'), async () => {
                throw new Error('quota exceeded')
            }),
        ).resolves.toBeUndefined()
        expect(m.dialogs.showMessage).toHaveBeenCalledWith(m.i18n.t.saveFailed)
    })

    it('adds a clip at the player position of the loaded track', async () => {
        await m.player.selectTrack(track('1'))
        m.trackPlayer.playerState.position = 12.5
        await m.player.addClipAtCurrentPosition(track('1'), createClip)
        expect(createClip).toHaveBeenCalledWith(track('1'), 12.5)
    })

    it('does not add a clip to the old track while another track is loading', async () => {
        await m.player.selectTrack(track('1'))
        createClip.mockClear()
        let releaseLoad: () => void = () => undefined
        ;(m.trackPlayer.default.load as unknown as jest.Mock).mockImplementationOnce(
            () =>
                new Promise<undefined>((resolve) => {
                    releaseLoad = () => resolve(undefined)
                }),
        )
        const pending = m.player.selectTrack(track('2'))
        await new Promise((resolve) => setTimeout(resolve, 0))
        await m.player.addClipAtCurrentPosition(track('1'), createClip)
        expect(createClip).not.toHaveBeenCalled()
        releaseLoad()
        await pending
    })
})
