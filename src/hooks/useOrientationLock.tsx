import { useAllowRotation } from '@/store/settings'
import { useEffect } from 'react'

type LockableOrientation = { lock?: (orientation: 'portrait') => Promise<void>; unlock?: () => void }

/**
 * Keeps the app in portrait format unless landscape format is allowed in the settings. The manifest allows any
 * orientation, so the setting decides. Browsers only lock the orientation in an installed app or in full screen,
 * otherwise the page rotates anyway and the landscape layout is used (see useControlsSide).
 */
export const useOrientationLock = () => {
    const [allowRotation] = useAllowRotation()
    useEffect(() => {
        if (typeof screen === 'undefined' || !screen.orientation) return
        const orientation = screen.orientation as unknown as LockableOrientation
        try {
            if (allowRotation) orientation.unlock?.()
            else orientation.lock?.('portrait')?.catch(() => {})
        } catch {
            // Not supported (e.g. desktop browsers)
        }
    }, [allowRotation])
}
