import { playbackService } from '@/constants/playbackService'
import { colors } from '@/constants/tokens'
import { useLogTrackPlayerState } from '@/hooks/useLogTrackPlayerState'
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

SplashScreen.preventAutoHideAsync()

TrackPlayer.registerPlaybackService(() => playbackService)

const App = () => {
	const handleTrackPlayerLoaded = useCallback(() => {
		SplashScreen.hideAsync()
	}, [])

	useSetupTrackPlayer({
		onLoad: handleTrackPlayerLoaded,
	})

	useLogTrackPlayerState()

	return (
		<SafeAreaProvider>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<ActionSheetProvider>
					<RootNavigation />
				</ActionSheetProvider>

				<StatusBar style="auto" />
			</GestureHandlerRootView>
		</SafeAreaProvider>
	)
}

const RootNavigation = () => {
	return (
		<Stack>
			<Stack.Screen name="(tabs)" options={{
				title: "Choreo Music Helper",
				headerShown: true,
				headerLargeTitle: true,
				headerLargeStyle: {
					backgroundColor: colors.background,
				},
				headerLargeTitleStyle: {
					color: colors.text,
				},
				headerStyle: { backgroundColor: colors.background },
				headerTintColor: colors.text,
				headerTransparent: false,
				headerBlurEffect: 'prominent',
				headerShadowVisible: false,

			}} />

			<Stack.Screen
				name="player"
				options={{
					presentation: 'card',
					gestureEnabled: true,
					gestureDirection: 'vertical',
					animationDuration: 400,
					headerShown: false,
				}}
			/>

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
		</Stack>
	)
}

export default App
