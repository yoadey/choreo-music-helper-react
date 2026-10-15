import { useAllowRotation } from '@/store/settings'
import { useEffect } from 'react'

type LockableOrientation = { lock?: (orientation: 'any') => Promise<void>; unlock?: () => void }

/**
 * Lets the app rotate once landscape format is allowed in the settings. The manifest fixes the installed app to
 * portrait format; locking to "any" overrides it, unlocking returns to it. Browsers only lock the orientation in an
 * installed app or in full screen, otherwise the page rotates anyway and the landscape layout is used (see
 * useControlsSide).
 */
export const useOrientationLock = () => {
    const [allowRotation] = useAllowRotation()
    useEffect(() => {
        if (typeof screen === 'undefined' || !screen.orientation || typeof document === 'undefined') return undefined
        const orientation = screen.orientation as unknown as LockableOrientation
        const apply = () => {
            try {
                if (allowRotation) orientation.lock?.('any')?.catch(() => {})
                else orientation.unlock?.()
            } catch {
                // Not supported (e.g. desktop browsers)
            }
        }
        apply()
        // The browser may release the lock while the app is in the background
        const onVisibilityChange = () => {
            if (!document.hidden) apply()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => document.removeEventListener('visibilitychange', onVisibilityChange)
    }, [allowRotation])
}
