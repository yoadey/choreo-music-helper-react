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
    setCurrentTrack('track1')
})

const setCurrentTrack = (id: string | null) => {
    const { useCurrentTrackStore } = require('@/store/store') as typeof import('@/store/store')
    useCurrentTrackStore.getState().setCurrentTrack(id ? ({ id } as never) : null)
}

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
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(mockSubscribeCalls).toHaveBeenCalledTimes(1)
        setCurrentTrack('track2')
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(mockSubscribeCalls).toHaveBeenCalledTimes(2)
    })

    it('uses the clips and the loop of the loaded song only, not of a last song that could not be loaded', async () => {
        const { useLoopStatusStore } = require('@/store/store') as typeof import('@/store/store')
        setCurrentTrack(null)
        m.store.setLoopStart({ id: 'a' })
        m.store.setLoopEnd({ id: 'b' })
        await startService()
        expect(mockSubscribeCalls).not.toHaveBeenCalled()
        expect(useLoopStatusStore.getState().active).toBe(false)
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

    it('does not show "playing" when the browser refuses the restart at the track end', async () => {
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        ;(TrackPlayer().play as unknown as jest.Mock).mockImplementationOnce(async () => {
            m.player.playerState.playWhenReady = true
        })
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        expect(m.player.playerState.playWhenReady).toBe(false)
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
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(useLoopStatusStore.getState().active).toBe(true)
        // Inverted loop: both markers set, but the loop is not active
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'a' })
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(useLoopStatusStore.getState().active).toBe(false)
    })
})

describe('preferences', () => {
    it('publishes the loop state once for several preference changes, without intermediate states', async () => {
        const { useLoopStatusStore } = require('@/store/store') as typeof import('@/store/store')
        await startService()
        m.store.setLoopStart({ id: 'a' })
        m.store.setLoopEnd({ id: 'b' })
        await new Promise((resolve) => setTimeout(resolve, 0))
        const states: boolean[] = []
        const unsubscribe = useLoopStatusStore.subscribe((loopState) => states.push(loopState.active))
        // Selecting another song clears the loop markers one after another
        m.store.clearLoop()
        m.store.setLoopStart({ id: 'b' })
        m.store.setLoopEnd({ id: 'c' })
        await new Promise((resolve) => setTimeout(resolve, 0))
        unsubscribe()
        expect(states).toEqual([])
        expect(useLoopStatusStore.getState().active).toBe(true)
    })

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

describe('player errors (state)', () => {
    it('remembers that the player dropped the song (reloaded on Play), without reloading by itself', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        const markFailed = jest.spyOn(helpers, 'markPlayerFailed')
        await startService()
        await progress(12.5)
        await setPlayerState(m.player.State.Error)
        expect(markFailed).toHaveBeenCalledWith(12.5)
        expect(TrackPlayer().reset).not.toHaveBeenCalled()
    })

    it('remembers the exact position of the error, also while the app is hidden', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        const markFailed = jest.spyOn(helpers, 'markPlayerFailed')
        await startService()
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        try {
            await progress(83.9)
            await setPlayerState(m.player.State.Error)
        } finally {
            Object.defineProperty(document, 'hidden', { value: false, configurable: true })
        }
        expect(markFailed).toHaveBeenCalledWith(83.9)
    })

    it('ignores the controls while another song is loading (they would use the clips of the old song)', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        await startService()
        await progress(5)
        jest.spyOn(helpers, 'isTrackLoading').mockReturnValue(true)
        await m.service.skipToNextClip()
        await m.service.seekToClip(20)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('cancels a pending start on pause', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        const cancel = jest.spyOn(helpers, 'cancelPendingPlay')
        await startService()
        await m.service.pausePlayback()
        await m.service.stopPlayback()
        expect(cancel).toHaveBeenCalledTimes(2)
    })

    it('does not jump in a song the user selected at the end of the old one', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        jest.spyOn(helpers, 'isTrackLoading').mockReturnValue(true)
        jest.spyOn(helpers, 'whenTrackIdle').mockImplementation(async () => setCurrentTrack('track2'))
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
    })

    it('restarts the loop when the newly selected song could not be loaded (the old one stays)', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        const loading = jest.spyOn(helpers, 'isTrackLoading').mockReturnValue(true)
        jest.spyOn(helpers, 'whenTrackIdle').mockImplementation(async () => {
            loading.mockReturnValue(false)
        })
        m.store.setLoopStart({ id: 'c' })
        m.store.setLoopEnd({ id: 'c' })
        await startService()
        m.player.playerState.position = 30
        await setPlayerState(m.player.State.Ended)
        expect(TrackPlayer().seekTo).toHaveBeenLastCalledWith(20)
    })
})

describe('pause', () => {
    it('does not load a dropped song again only to pause it', async () => {
        const helpers = require('@/helpers/player') as typeof import('@/helpers/player')
        await startService()
        helpers.markPlayerFailed(5)
        const ensure = jest.spyOn(helpers, 'ensureTrackLoaded')
        await m.service.pausePlayback()
        expect(ensure).not.toHaveBeenCalled()
    })

    it('never rejects, e.g. before the player is set up', async () => {
        await startService()
        ;(TrackPlayer().pause as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('The player is not set up')
        })
        await expect(m.service.pausePlayback()).resolves.toBeUndefined()
    })
})

describe('switching songs', () => {
    it('keeps showing a set loop as active while the clips of the new song are read', async () => {
        const { useLoopStatusStore } = require('@/store/store') as typeof import('@/store/store')
        m.store.setLoopStart({ id: 'a' })
        m.store.setLoopEnd({ id: 'b' })
        await startService()
        expect(useLoopStatusStore.getState().active).toBe(true)
        const states: boolean[] = []
        const unsubscribe = useLoopStatusStore.subscribe((loopState) => states.push(loopState.active))
        setCurrentTrack('track2')
        // The clips are not read yet
        expect(states).not.toContain(false)
        mockClipSubscriber?.(clips)
        unsubscribe()
        expect(useLoopStatusStore.getState().active).toBe(true)
    })
})

describe('without a loaded song', () => {
    it('ignores the controls (e.g. before the player is set up) instead of failing', async () => {
        await startService()
        setCurrentTrack(null)
        ;(TrackPlayer().pause as unknown as jest.Mock).mockImplementationOnce(async () => {
            throw new Error('The player is not set up')
        })
        await expect(m.service.stopPlayback()).resolves.toBeUndefined()
        await expect(m.service.skipToNextClip()).resolves.toBeUndefined()
        await expect(m.service.jumpBy(10)).resolves.toBeUndefined()
        expect(TrackPlayer().pause).not.toHaveBeenCalled()
        expect(TrackPlayer().seekTo).not.toHaveBeenCalled()
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
