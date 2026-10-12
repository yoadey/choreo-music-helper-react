import { playbackService } from '@/constants/playbackService'
import { colors } from '@/constants/tokens'
import { selectTrack } from '@/helpers/player'
import { useMediaSession } from '@/hooks/useMediaSession'
import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import { t } from '@/i18n'
import { database } from '@/model/index.web'
import TrackWithClips from '@/model/track'
import { clearLastTrack, getLastTrack } from '@/store/playbackState'
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { SplashScreen, Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TrackPlayer from 'react-native-track-player'

SplashScreen.preventAutoHideAsync()

TrackPlayer.registerPlaybackService(() => playbackService)

const restoreLastTrack = async () => {
    const trackId = getLastTrack()
    if (!trackId) return
    try {
        const track = await database.get<TrackWithClips>('tracks').find(trackId)
        await selectTrack(track, { silent: true })
    } catch {
        // The track was deleted
        clearLastTrack()
    }
}

const App = () => {
    const handleTrackPlayerLoaded = useCallback((success: boolean) => {
        SplashScreen.hideAsync()
        if (success) {
            restoreLastTrack()
        }
    }, [])

    useSetupTrackPlayer({ onLoad: handleTrackPlayerLoaded })
    useMediaSession()

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <ActionSheetProvider>
                    <RootNavigation />
                </ActionSheetProvider>
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
