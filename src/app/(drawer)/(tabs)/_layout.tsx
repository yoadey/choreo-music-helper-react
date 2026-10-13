import { PlayerControls } from '@/components/PlayerControls'
import { colors, fontSize } from '@/constants/tokens'
import { useNavigationOpenFile } from '@/hooks/useNavigationOpenFile'
import { t } from '@/i18n'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

const TabsNavigation = () => {
	useNavigationOpenFile()

	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.primary,
					tabBarInactiveTintColor: colors.textMuted,
					tabBarLabelStyle: {
						fontSize: fontSize.xs,
						fontWeight: '500',
					},
					tabBarStyle: {
						backgroundColor: colors.backgroundSecondary,
						borderBottomWidth: 0,
					},
					tabBarActiveBackgroundColor: colors.backgroundHighlighted,
					tabBarPosition: 'top',
					headerShown: false,
				}}
				initialRouteName="(songs)"
			>
				<Tabs.Screen
					name="(songs)"
					options={{
						title: t.songs,
						tabBarIcon: ({ color }) => <MaterialCommunityIcons name="music" size={24} color={color} />,
						tabBarLabelPosition: 'beside-icon',
					}}
				/>
				<Tabs.Screen
					name="(clips)"
					options={{
						title: t.clips,
						tabBarIcon: ({ color }) => <MaterialCommunityIcons name="playlist-play" size={28} color={color} />,
						tabBarLabelPosition: 'beside-icon',
					}}
				/>
			</Tabs>

			<PlayerControls />
		</>
	)
}

export default TabsNavigation
