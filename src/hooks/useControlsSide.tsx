import { useAllowRotation, useControlsSideSetting } from '@/store/settings'
import { useWindowDimensions } from 'react-native'

/**
 * Side of the screen on which the player controls are shown next to the lists, null if they are shown below them
 * (portrait format or landscape format not allowed in the settings).
 */
export const useControlsSide = () => {
	const { width, height } = useWindowDimensions()
	const [allowRotation] = useAllowRotation()
	const [side] = useControlsSideSetting()
	return allowRotation && width > height ? side : null
}
