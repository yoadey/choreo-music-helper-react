import { describe, expect, it } from '@jest/globals'
import { playerState } from '@/testUtils/trackPlayerMock'
import { publishProgress, refreshProgress, usePlayerProgressStore } from '../progress'

describe('shared player progress', () => {
    it('can be refreshed explicitly (e.g. after a seek while paused)', async () => {
        playerState.position = 42
        await refreshProgress()
        expect(usePlayerProgressStore.getState().position).toBe(42)
    })

    it('does not notify subscribers when nothing changed', () => {
        publishProgress(7, 12)
        let notified = 0
        const unsubscribe = usePlayerProgressStore.subscribe(() => notified++)
        publishProgress(7, 12)
        expect(notified).toBe(0)
        publishProgress(7.05, 12)
        expect(notified).toBe(1)
        unsubscribe()
    })
})
