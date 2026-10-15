import { useControlsSideSetting } from '@/store/settings'
import { useSyncExternalStore } from 'react'
import { Dimensions } from 'react-native'

// The size of the layout viewport: unlike the window size of react-native-web (the visual viewport), it does not
// shrink when the on-screen keyboard opens, which would switch a phone in portrait format to the landscape layout
const landscapeQuery =
	typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(orientation: landscape)')
		: null

const subscribe = (onChange: () => void) => {
	if (landscapeQuery) {
		landscapeQuery.addEventListener('change', onChange)
		return () => landscapeQuery.removeEventListener('change', onChange)
	}
	const subscription = Dimensions.addEventListener('change', onChange)
	return () => subscription.remove()
}

const isLandscape = () => {
	if (landscapeQuery) return landscapeQuery.matches
	const { width, height } = Dimensions.get('window')
	return width > height
}

/**
 * Side of the screen on which the player controls are shown next to the lists in landscape format (window wider
 * than high, e.g. on a computer or when the browser rotates the app anyway), null in portrait format where they are
 * shown below them. Whether the app may rotate is a separate setting (see useOrientationLock).
 */
export const useControlsSide = () => {
	// Only re-renders when the orientation changes, not on every resize
	const landscape = useSyncExternalStore(subscribe, isLandscape)
	const [side] = useControlsSideSetting()
	return landscape ? side : null
}
