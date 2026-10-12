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
