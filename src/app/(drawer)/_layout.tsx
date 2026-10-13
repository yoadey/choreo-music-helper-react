import { trackDisplayTitle } from '@/helpers/miscellaneous'
import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { t } from '@/i18n'
import { FontAwesome6 } from '@expo/vector-icons'
import { Drawer } from 'expo-router/drawer'
import { Platform } from 'react-native'

const drawerStyleOptions = {
    headerStyle: { backgroundColor: colors.backgroundSecondary },
    headerTintColor: colors.text,
    headerTransparent: false,
    headerShadowVisible: false,
    drawerStyle: { backgroundColor: colors.backgroundHighlighted },
    drawerActiveBackgroundColor: colors.maximumTrackTintColor,
    drawerLabelStyle: { color: colors.text },
    drawerInactiveTintColor: colors.text,
    drawerActiveTintColor: colors.text,
} as const

const DrawerNavigator = () => {
    const { currentTrack } = useCurrentTrack()
    return (
        <Drawer>
            <Drawer.Screen
                name="(tabs)"
                options={{
                    ...drawerStyleOptions,
                    title: t.musicPlayer,
                    headerShown: true,
                    headerTitle: `${currentTrack ? `${trackDisplayTitle(currentTrack.title)} - ` : ''}Choreo Music Helper`,
                    drawerIcon: ({ color, size }) => <FontAwesome6 name="music" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="share"
                options={
                    Platform.OS === 'android'
                        ? {
                              title: t.share,
                              headerShown: false,
                              drawerIcon: ({ color, size }) => (
                                  <FontAwesome6 name="share-from-square" size={size} color={color} />
                              ),
                          }
                        : { drawerItemStyle: { display: 'none' } }
                }
            />
            <Drawer.Screen
                name="settings"
                options={{
                    ...drawerStyleOptions,
                    title: t.settings,
                    headerShown: true,
                    drawerIcon: ({ color, size }) => <FontAwesome6 name="gear" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="info"
                options={{
                    ...drawerStyleOptions,
                    title: t.info,
                    headerShown: true,
                    drawerIcon: ({ color, size }) => <FontAwesome6 name="circle-info" size={size} color={color} />,
                }}
            />
        </Drawer>
    )
}

export default DrawerNavigator
