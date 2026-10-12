import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { playerState } from '@/testUtils/trackPlayerMock'
import TrackPlayer from 'react-native-track-player'
import { refreshProgress, startProgressPolling, usePlayerProgressStore } from '../progress'

afterEach(() => {
    jest.useRealTimers()
})

describe('progress polling (one shared source instead of one poll per component)', () => {
    it('publishes the player progress and stops on cleanup', async () => {
        jest.useFakeTimers()
        playerState.position = 3
        playerState.duration = 12
        const stop = startProgressPolling(50, () => true)
        await jest.advanceTimersByTimeAsync(60)
        expect(usePlayerProgressStore.getState()).toMatchObject({ position: 3, duration: 12 })

        stop()
        playerState.position = 5
        await jest.advanceTimersByTimeAsync(200)
        expect(usePlayerProgressStore.getState().position).toBe(3)
    })

    it('does not notify subscribers when nothing changed', async () => {
        jest.useFakeTimers()
        playerState.position = 7
        const stop = startProgressPolling(50, () => true)
        await jest.advanceTimersByTimeAsync(60)
        const listener = jest.fn()
        const unsubscribe = usePlayerProgressStore.subscribe(listener)
        await jest.advanceTimersByTimeAsync(200)
        expect(listener).not.toHaveBeenCalled()
        unsubscribe()
        stop()
    })

    it('does not poll while the player is not playing (or the page is hidden)', async () => {
        jest.useFakeTimers()
        ;(TrackPlayer.getProgress as unknown as jest.Mock).mockClear()
        const stop = startProgressPolling(50, () => false)
        await jest.advanceTimersByTimeAsync(500)
        expect(TrackPlayer.getProgress).not.toHaveBeenCalled()
        stop()
    })

    it('can be refreshed explicitly (e.g. after a seek while paused)', async () => {
        playerState.position = 42
        await refreshProgress()
        expect(usePlayerProgressStore.getState().position).toBe(42)
    })
})
