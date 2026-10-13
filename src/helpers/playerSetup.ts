import TrackPlayer, { Capability } from 'react-native-track-player'

let setupPromise: Promise<void> | undefined

const isAlreadyInitialized = (error: unknown) =>
	typeof error === 'object' && error !== null && (error as { code?: string }).code === 'player_already_initialized'

const setupPlayer = async () => {
	try {
		await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 10 })
	} catch (error) {
		// Happens after a fast refresh or a remount, the player is usable
		if (!isAlreadyInitialized(error)) throw error
	}

	await TrackPlayer.updateOptions({
		capabilities: [
			Capability.Play,
			Capability.Pause,
			Capability.SkipToNext,
			Capability.SkipToPrevious,
			Capability.JumpForward,
			Capability.JumpBackward,
			Capability.SeekTo,
			Capability.Stop,
		],
		forwardJumpInterval: 10,
		backwardJumpInterval: 10,
		progressUpdateEventInterval: 0.05, // 50ms
	})
}

/**
 * Sets up the player once and resolves when it is ready. Everything that uses the player has to wait for
 * it: on the web the player library is loaded lazily, so the UI can be used before the player exists.
 */
export const ensurePlayerSetup = (): Promise<void> => {
	setupPromise ??= setupPlayer().catch((error) => {
		// Allow another attempt
		setupPromise = undefined
		throw error
	})
	return setupPromise
}
