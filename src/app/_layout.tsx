import { isPlayerPlaying, playbackService } from '@/constants/playbackService'
import { colors } from '@/constants/tokens'
import { restoreLastTrack } from '@/helpers/player'
import { useMediaSession } from '@/hooks/useMediaSession'
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { startProgressPolling } from '@/store/progress'
import { useCallback, useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

SplashScreen.preventAutoHideAsync()

TrackPlayer.registerPlaybackService(() => playbackService)

/** Separate component, so the frequent progress updates of the media session do not re-render the app. */
const MediaSession = () => {
    useMediaSession()
    return null
}

const App = () => {
    const handleTrackPlayerLoaded = useCallback((success: boolean) => {
        SplashScreen.hideAsync()
        if (success) {
            restoreLastTrack(database)
        }
    }, [])

    useSetupTrackPlayer({ onLoad: handleTrackPlayerLoaded })
    // One progress poll for the whole app (only while playing and visible), components use the store
    useEffect(
        () => startProgressPolling(50, () => isPlayerPlaying() && !(typeof document !== 'undefined' && document.hidden)),
        [],
    )

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ActionSheetProvider>
                    <RootNavigation />
                </ActionSheetProvider>
                <MediaSession />
                <StatusBar style="light" />
            </GestureHandlerRootView>
        </SafeAreaProvider>
    )
}

const modalOptions = (title: string) =>
    ({
        presentation: 'transparentModal',
        headerStyle: { backgroundColor: colors.background },
        headerTitle: title,
        headerTitleStyle: { color: colors.text },
        headerShown: false,
    }) as const

const RootNavigation = () => (
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(modals)/speed" options={modalOptions(t.speed)} />
        <Stack.Screen name="(modals)/loop" options={modalOptions(t.preparationTime)} />
        <Stack.Screen name="(modals)/edit-clip" options={modalOptions(t.editClip)} />
        <Stack.Screen name="(modals)/edit-track" options={modalOptions(t.editTrack)} />
        <Stack.Screen
            name="licenses"
            options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: t.licenses,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
            }}
        />
    </Stack>
)

export default App
