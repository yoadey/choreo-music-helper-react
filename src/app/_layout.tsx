import { playbackService } from '@/constants/playbackService'
import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { getLastTrack } from '@/store/playbackState'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'
import Tutorial from '@/components/Tutorial'

SplashScreen.preventAutoHideAsync()

TrackPlayer.registerPlaybackService(() => playbackService)

const App = () => {
	const { setCurrentTrack } = useCurrentTrack()
	const handleTrackPlayerLoaded = useCallback(() => {
		SplashScreen.hideAsync()

		let trackId = getLastTrack();
		if (trackId) {
			database.get<TrackWithClips>("tracks")
				.find(trackId)
				.then(setCurrentTrack)
		}
	}, [])

	useSetupTrackPlayer({
		onLoad: handleTrackPlayerLoaded,
	})

	return (
		<SafeAreaProvider>
			<GestureHandlerRootView style={{ flex: 1 }}>
                                <ActionSheetProvider>
                                        <RootNavigation />
                                        <Tutorial />
                                </ActionSheetProvider>

				<StatusBar style="auto" />
			</GestureHandlerRootView>
		</SafeAreaProvider>
	)
}

const RootNavigation = () => {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(drawer)" />

			<Stack.Screen
				name="(modals)/speed"
				options={{
					presentation: 'transparentModal',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitle: 'Speed',
					headerTitleStyle: {
						color: colors.text,
					},
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="(modals)/loop"
				options={{
					presentation: 'transparentModal',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitle: 'Loop',
					headerTitleStyle: {
						color: colors.text,
					},
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="(modals)/edit"
				options={{
					presentation: 'transparentModal',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitle: 'Edit Clip',
					headerTitleStyle: {
						color: colors.text,
					},
					headerShown: false,
				}}
			/>

			<Stack.Screen
				name="licenses"
				options={{
					presentation: 'modal',
					headerStyle: {
						backgroundColor: colors.background,
					},
					headerTitle: 'Edit Clip',
					headerTitleStyle: {
						color: colors.text,
					},
					headerShown: false,
				}}
			/>
		</Stack>
	);
}

export default App
