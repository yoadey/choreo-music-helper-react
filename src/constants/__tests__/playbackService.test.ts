import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type FakeClip = { id: string; position: number; speed: number | null }

let mockClipSubscriber: ((clips: FakeClip[]) => void) | undefined
const mockSubscribeCalls = jest.fn()

jest.mock('@/model/index.web', () => ({
    database: {
        get: () => ({
            query: () => ({
                observeWithColumns: () => ({
                    subscribe: (callback: (clips: FakeClip[]) => void) => {
                        mockSubscribeCalls()
                        mockClipSubscriber = callback
                        return { unsubscribe: () => (mockClipSubscriber = undefined) }
                    },
                }),
            }),
        }),
    },
}))

type Modules = {
    service: typeof import('../playbackService')
    store: typeof import('@/store/playbackState')
    player: typeof import('@/testUtils/trackPlayerMock')
}

let m: Modules

const clips: FakeClip[] = [
    { id: 'a', position: 0, speed: 1 },
    { id: 'b', position: 10, speed: 1 },
    { id: 'c', position: 20, speed: 0.5 },
]

const progress = async (position: number, duration = 30) => {
    m.player.playerState.position = position
    m.player.playerState.duration = duration
    await m.player.emitPlayerEvent(m.player.Event.PlaybackProgressUpdated, { position, duration })
}

const startService = async () => {
    await m.service.playbackService()
    mockClipSubscriber?.(clips)
    m.player.playerState.state = m.player.State.Playing
    m.player.playerState.duration = 30
}

beforeEach(() => {
    jest.resetModules()
    localStorage.clear()
    mockClipSubscriber = undefined
    mockSubscribeCalls.mockClear()
    m = {
        service: require('../playbackService'),
        store: require('@/store/playbackState'),
        player: require('react-native-track-player'),
    }
    m.player.resetTrackPlayerMock()
    m.store.setLastTrack('track1')
})

const TrackPlayer = () => m.player.default

describe('preferences', () => {
    it('applies stored preferences right after start, without waiting for a change', async () => {
        m.store.preferences.set(m.store.KEY_SPEED, 0.8)
        m.store.preferences.set(m.store.KEY_GLOBAL_SPEED_ONLY, true)
        await startService()
        await progress(5)
        expect(TrackPlayer().setRate).toHaveBeenLastCalledWith(0.8)
    })

    it('does not resubscribe to the clips when an unrelated preference changes', async () => {
        await startService()
        expect(mockSubscribeCalls).toHaveBeenCalledTimes(1)
        m.store.preferences.set(m.store.KEY_SPEED, 1.2)
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 2)
        expect(mockSubscribeCalls).toHaveBeenCalledTimes(1)
        m.store.setLastTrack('track2')
        expect(mockSubscribeCalls).toHaveBeenCalledTimes(2)
    })
})

describe('speed', () => {
    it('uses normal speed before the first clip instead of the last clip speed', async () => {
        await startService()
        mockClipSubscriber?.([{ id: 'x', position: 10, speed: 1.5 }, { id: 'y', position: 20, speed: 0.5 }])
        await progress(1)
        expect(TrackPlayer().setRate).toHaveBeenLastCalledWith(1)
    })

    it('does not set the rate again when nothing changed', async () => {
        await startService()
        await progress(5)
        await progress(5.05)
        expect(TrackPlayer().setRate).toHaveBeenCalledTimes(1)
    })
})

describe('loop', () => {
    it('seeks back to the lead in after the lead out of an active loop', async () => {
        m.store.setLoopStart({ id: 'b' })
        m.store.setLoopEnd({ id: 'b' })
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 2)
        m.store.preferences.set(m.store.KEY_LEAD_OUT_DURATION, 2)
        await startService()
        await progress(22.5)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(8)
    })

    it('does not seek when A lies behind B', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'a' })
        await startService()
        await progress(25)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('does not seek (to NaN) when only B is set', async () => {
        m.store.setLoopEnd({ id: 'a' })
        await startService()
        await progress(25)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('ignores loop markers of deleted clips', async () => {
        m.store.setLoopStart({ id: 'deleted' })
        m.store.setLoopEnd({ id: 'b' })
        await startService()
        await progress(25)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('follows the current clip positions instead of stale snapshots', async () => {
        m.store.setLoopStart({ id: 'a' })
        m.store.setLoopEnd({ id: 'a' })
        await startService()
        mockClipSubscriber?.([{ id: 'a', position: 0, speed: 1 }, { id: 'b', position: 5, speed: 1 }])
        await progress(6)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(0)
    })

    it('restarts the loop when the track ends inside the loop (B on the last clip)', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 3)
        await startService()
        await m.player.emitPlayerEvent(m.player.Event.PlaybackState, { state: m.player.State.Ended })
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(17)
        expect(TrackPlayer().play).toHaveBeenCalled()
    })

    it('does not restart at the track end without loop', async () => {
        await startService()
        await m.player.emitPlayerEvent(m.player.Event.PlaybackState, { state: m.player.State.Ended })
        expect(TrackPlayer().play).not.toHaveBeenCalled()
    })

    it('resets the volume after the loop was removed during the lead in', async () => {
        m.store.setLoopStart({ id: 'b' })
        m.store.setLoopEnd({ id: 'b' })
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 4)
        m.store.preferences.set(m.store.KEY_LEAD_IN_VOLUME, 0.2)
        await startService()
        await progress(8)
        expect(TrackPlayer().setVolume).toHaveBeenLastCalledWith(0.2)
        m.store.setLoopStart(undefined)
        await progress(8.1)
        expect(TrackPlayer().setVolume).toHaveBeenLastCalledWith(1)
    })
})

describe('stopPlayback', () => {
    it('pauses and returns to the start instead of unloading the track', async () => {
        await startService()
        m.player.playerState.position = 12
        await m.service.stopPlayback()
        expect(TrackPlayer().stop).not.toHaveBeenCalled()
        expect(TrackPlayer().pause).toHaveBeenCalled()
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(0)
    })

    it('returns to the lead in of an active loop', async () => {
        m.store.setLoopStart({ id: 'b' })
        m.store.setLoopEnd({ id: 'c' })
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 4)
        await startService()
        await m.service.stopPlayback()
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(6)
    })

    it('is used for the remote stop event', async () => {
        await startService()
        await m.player.emitPlayerEvent(m.player.Event.RemoteStop)
        expect(TrackPlayer().stop).not.toHaveBeenCalled()
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(0)
    })
})

describe('clip navigation', () => {
    it('does not crash on "next" in the last clip', async () => {
        await startService()
        m.player.playerState.position = 25
        await expect(m.service.skipToNextClip()).resolves.toBeUndefined()
        await expect(m.player.emitPlayerEvent(m.player.Event.RemoteNext)).resolves.not.toThrow()
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('goes to the previous clip from the last clip', async () => {
        await startService()
        m.player.playerState.position = 25
        await m.service.skipToPreviousClip()
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(10)
    })

    it('does not crash on "previous" in the first clip', async () => {
        await startService()
        m.player.playerState.position = 5
        await m.player.emitPlayerEvent(m.player.Event.RemotePrevious)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(0)
    })

    it('respects the lead in', async () => {
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 2)
        await startService()
        m.player.playerState.position = 5
        await m.service.skipToNextClip()
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(8)
        await m.service.seekToClip(20)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(18)
    })
})
