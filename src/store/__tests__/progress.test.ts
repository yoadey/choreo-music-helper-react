import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { playerState } from '@/testUtils/trackPlayerMock'
import { startProgressPolling, usePlayerProgressStore } from '../progress'

afterEach(() => {
    jest.useRealTimers()
})

describe('progress polling (one shared source instead of one poll per component)', () => {
    it('publishes the player progress and stops on cleanup', async () => {
        jest.useFakeTimers()
        playerState.position = 3
        playerState.duration = 12
        const stop = startProgressPolling(50)
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
        const stop = startProgressPolling(50)
        await jest.advanceTimersByTimeAsync(60)
        const listener = jest.fn()
        const unsubscribe = usePlayerProgressStore.subscribe(listener)
        await jest.advanceTimersByTimeAsync(200)
        expect(listener).not.toHaveBeenCalled()
        unsubscribe()
        stop()
    })
})
