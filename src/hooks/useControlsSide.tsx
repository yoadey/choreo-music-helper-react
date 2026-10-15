import { useControlsSideSetting } from '@/store/settings'
import { useWindowDimensions } from 'react-native'

/**
 * Side of the screen on which the player controls are shown next to the lists in landscape format (window wider
 * than high, e.g. on a computer or when the browser rotates the app anyway), null in portrait format where they are
 * shown below them. Whether the app may rotate is a separate setting (see useOrientationLock).
 */
export const useControlsSide = () => {
	const { width, height } = useWindowDimensions()
	const [side] = useControlsSideSetting()
	return width > height ? side : null
}
