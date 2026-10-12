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

    it('makes the track current after it was loaded', async () => {
        await expect(m.player.selectTrack(track('1'))).resolves.toBe(true)
        expect(m.store.useCurrentTrackStore.getState().currentTrack).toEqual(track('1'))
        expect(m.prefs.getLastTrack()).toBe('1')
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
        expect(m.prefs.getLastTrack()).toBeUndefined()
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

describe('switching tracks', () => {
    it('loads the new track paused, so the UI does not show it as playing', async () => {
        await m.player.selectTrack(track('1'))
        m.trackPlayer.playerState.playWhenReady = true
        await m.player.selectTrack(track('2'))
        expect(m.trackPlayer.playerState.playWhenReady).toBe(false)
    })
})

describe('addClipAtCurrentPosition', () => {
    const createClip = jest.fn(async () => undefined)

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
