import { ensurePlayerSetup } from '@/helpers/playerSetup'
import { useEffect } from 'react'

/** Sets up the player once. onLoad is called after the setup, also if it failed. */
export const useSetupTrackPlayer = ({ onLoad }: { onLoad?: (success: boolean) => void }) => {
	useEffect(() => {
		ensurePlayerSetup()
			.then(() => onLoad?.(true))
			.catch((error) => {
				console.error('Could not set up the player', error)
				onLoad?.(false)
			})
	}, [onLoad])
}
