import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { FontAwesome6 } from '@expo/vector-icons'
import { Drawer } from 'expo-router/drawer'
import { Platform } from 'react-native'

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
                    drawerInactiveTintColor: colors.text,
                    drawerActiveTintColor: colors.text,
                    drawerIcon: ({ color, size }) => (
                        <FontAwesome6 name="music" size={size} color={color} />
                    ),
                }}
            />
            {Platform.OS === 'android' ?
                <Drawer.Screen
                    name="share"
                    options={{
                        title: `Share`,
                        drawerIcon: ({ color, size }) => (
                            <FontAwesome6 name="share-from-square" size={size} color={color} />
                        ),
                        headerShown: false,
                    }}
                /> :
                <Drawer.Screen
                    name="share"
                    options={{
                        drawerItemStyle: {
                            display: "none"
                        }
                    }}
                />
            }
            <Drawer.Screen
                name="settings"
                options={{
                    title: `Settings`,
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
                    drawerInactiveTintColor: colors.text,
                    drawerActiveTintColor: colors.text,
                    drawerIcon: ({ color, size }) => (
                        <FontAwesome6 name="gear" size={size} color={color} />
                    ),
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
                    drawerInactiveTintColor: colors.text,
                    drawerActiveTintColor: colors.text,
                    drawerIcon: ({ color, size }) => (
                        <FontAwesome6 name="circle-info" size={size} color={color} />
                    ),
                }}
            />
        </Drawer>
    )
}

export default DrawerNavigator
