import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { Drawer } from 'expo-router/drawer'
import { FontAwesome6 } from '@expo/vector-icons'

const DrawerNavigator = () => {
	const { currentTrack } = useCurrentTrack()
	return (
                <Drawer>
                        <Drawer.Screen
                                name="(tabs)"
                                options={{
                                        title: `Music Player`,
                                        headerShown: true,
                                        headerTitle: `${currentTrack ? currentTrack?.title + ' - ' : ''}Choreo Music Helper`,
                                        headerStyle: { backgroundColor: colors.backgroundSecondary },
                                        headerTintColor: colors.text,
                                        headerTransparent: false,
                                        headerShadowVisible: false,
                                        drawerStyle: {
                                                backgroundColor: colors.backgroundHighlighted,
                                        },
                                        drawerActiveBackgroundColor: colors.maximumTrackTintColor,
                                        drawerLabelStyle: {
                                                color: colors.text,
                                        },
                                        drawerIcon: ({ color, size }) => (
                                                <FontAwesome6 name="music" size={size} color={color} />
                                        ),
                                }}
                        />
                        <Drawer.Screen
                                name="share"
                                options={{
                                        title: `Share`,
                                        drawerIcon: ({ color, size }) => (
                                                <FontAwesome6 name="share-from-square" size={size} color={color} />
                                        ),
                                        headerShown: false,
                                }}
                        />
                        <Drawer.Screen
                                name="info"
                                options={{
                                        title: `Info`,
                                        headerShown: true,
                                        headerStyle: { backgroundColor: colors.backgroundSecondary },
                                        headerTintColor: colors.text,
                                        headerTransparent: false,
                                        headerShadowVisible: false,
                                        drawerStyle: {
                                                backgroundColor: colors.backgroundHighlighted,
                                        },
                                        drawerActiveBackgroundColor: colors.maximumTrackTintColor,
                                        drawerLabelStyle: {
                                                color: colors.text,
                                        },
                                        drawerIcon: ({ color, size }) => (
                                                <FontAwesome6 name="info-circle" size={size} color={color} />
                                        ),
                                }}
                        />
                </Drawer>
        )
}

export default DrawerNavigator
