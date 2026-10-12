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

const setPlayerState = async (state: string) => {
    m.player.playerState.state = state
    await m.player.emitPlayerEvent(m.player.Event.PlaybackState, { state })
}

const startService = async () => {
    await m.service.playbackService()
    mockClipSubscriber?.(clips)
    m.player.playerState.duration = 30
    await setPlayerState(m.player.State.Playing)
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
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(17)
        expect(TrackPlayer().play).toHaveBeenCalled()
    })

    it('restarts a loop that reaches the track end before the player stops (no pause at the end)', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 3)
        await startService()
        await progress(29.9)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(17)
    })

    it('restarts the loop when the track ends earlier than its reported duration (estimated VBR length)', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        m.player.playerState.position = 28
        await setPlayerState(m.player.State.Ended)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(20)
        expect(TrackPlayer().play).toHaveBeenCalled()
    })

    it('restarts the loop only once when the player reports both the state and the queue end', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        m.player.playerState.position = 30
        m.player.playerState.state = m.player.State.Ended
        await Promise.all([
            m.player.emitPlayerEvent(m.player.Event.PlaybackState, { state: m.player.State.Ended }),
            m.player.emitPlayerEvent(m.player.Event.PlaybackQueueEnded, {}),
        ])
        expect(TrackPlayer().seekTo).toHaveBeenCalledTimes(1)
        expect(TrackPlayer().play).toHaveBeenCalledTimes(1)
    })

    it('restarts the loop only once when the second end event arrives after the restart', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        await m.player.emitPlayerEvent(m.player.Event.PlaybackQueueEnded, {})
        expect(TrackPlayer().seekTo).toHaveBeenCalledTimes(1)
        expect(TrackPlayer().play).toHaveBeenCalledTimes(1)
    })

    it('does not restart at the track end without loop', async () => {
        await startService()
        await setPlayerState(m.player.State.Ended)
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

describe('loop state for the UI', () => {
    it('publishes whether the loop is active', async () => {
        const { useLoopStatusStore } = require('@/store/store') as typeof import('@/store/store')
        await startService()
        expect(useLoopStatusStore.getState().active).toBe(false)
        m.store.setLoopStart({ id: 'a' })
        m.store.setLoopEnd({ id: 'b' })
        expect(useLoopStatusStore.getState().active).toBe(true)
        // Inverted loop: both markers set, but the loop is not active
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'a' })
        expect(useLoopStatusStore.getState().active).toBe(false)
    })
})

describe('preferences', () => {
    it('applies several preference changes (e.g. the OK of a dialog) once', async () => {
        await startService()
        const getProgress = TrackPlayer().getProgress as unknown as jest.Mock
        getProgress.mockClear()
        m.store.preferences.set(m.store.KEY_LEAD_IN_DURATION, 3)
        m.store.preferences.set(m.store.KEY_LEAD_OUT_DURATION, 2)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(getProgress).toHaveBeenCalledTimes(1)
    })
})

describe('play state', () => {
    it('resets "play when ready" when the browser pauses or a new track is ready, so the UI shows Play', async () => {
        await startService()
        const setPlayWhenReady = TrackPlayer().setPlayWhenReady as unknown as jest.Mock
        setPlayWhenReady.mockClear()
        await setPlayerState(m.player.State.Paused)
        expect(setPlayWhenReady).toHaveBeenLastCalledWith(false)
        setPlayWhenReady.mockClear()
        await setPlayerState(m.player.State.Ready)
        expect(setPlayWhenReady).toHaveBeenLastCalledWith(false)
        setPlayWhenReady.mockClear()
        await setPlayerState(m.player.State.Buffering)
        expect(setPlayWhenReady).not.toHaveBeenCalled()
    })

    it('sets "play when ready" when the audio plays, e.g. after Play was pressed while the track was loading', async () => {
        await startService()
        await setPlayerState(m.player.State.Ready)
        await setPlayerState(m.player.State.Playing)
        expect(TrackPlayer().setPlayWhenReady).toHaveBeenLastCalledWith(true)
    })

    it('resets "play when ready" at the track end without loop', async () => {
        await startService()
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        expect(TrackPlayer().setPlayWhenReady).toHaveBeenLastCalledWith(false)
    })

    it('publishes whole seconds while the app is hidden (e.g. for the lock screen), not every event', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await startService()
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        try {
            await progress(12.5, 30)
            expect(usePlayerProgressStore.getState()).toMatchObject({ position: 12, duration: 30 })
        } finally {
            Object.defineProperty(document, 'hidden', { value: false, configurable: true })
        }
    })

    it('publishes the progress events for the UI (no separate polling)', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await startService()
        await progress(12.5, 30)
        expect(usePlayerProgressStore.getState()).toMatchObject({ position: 12.5, duration: 30 })
    })
})

describe('player errors', () => {
    it('retries the rate after a failed setRate instead of skipping it forever', async () => {
        await startService()
        ;(TrackPlayer().setRate as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('player reset')
        })
        await progress(5)
        await progress(5.05)
        expect(TrackPlayer().setRate).toHaveBeenCalledTimes(2)
    })
})

describe('efficiency', () => {
    it('tracks the player state from events instead of querying it on every progress tick', async () => {
        await startService()
        ;(TrackPlayer().getPlaybackState as unknown as jest.Mock).mockClear()
        await progress(5)
        await progress(5.05)
        await progress(5.1)
        expect(TrackPlayer().getPlaybackState).not.toHaveBeenCalled()
    })

    it('does not apply the loop while paused', async () => {
        m.store.setLoopStart({ id: 'b' })
        m.store.setLoopEnd({ id: 'b' })
        await startService()
        await setPlayerState(m.player.State.Paused)
        await progress(25)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('computes the clip ranges only when clips, duration or preferences change', async () => {
        const playback = require('@/helpers/playback') as typeof import('@/helpers/playback')
        const buildClipRanges = jest.spyOn(playback, 'buildClipRanges')
        await startService()
        await progress(5)
        const calls = buildClipRanges.mock.calls.length
        await progress(5.05)
        await progress(5.1)
        await progress(5.15)
        expect(buildClipRanges.mock.calls.length).toBe(calls)
        mockClipSubscriber?.([...clips, { id: 'd', position: 25, speed: 1 }])
        expect(buildClipRanges.mock.calls.length).toBe(calls + 1)
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

    it('updates the shared progress after seeking (also while paused)', async () => {
        const { usePlayerProgressStore } = require('@/store/progress') as typeof import('@/store/progress')
        await startService()
        await setPlayerState(m.player.State.Paused)
        await m.service.seekToClip(20)
        expect(usePlayerProgressStore.getState().position).toBe(20)
        await m.service.seekTo(7)
        expect(usePlayerProgressStore.getState().position).toBe(7)
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
