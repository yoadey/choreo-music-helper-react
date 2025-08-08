import { PlayerControls } from '@/components/PlayerControls'
import { colors, fontSize } from '@/constants/tokens'
import { useNavigationOpenFile } from '@/hooks/useNavigationOpenFile'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

const TabsNavigation = () => {
	
	useNavigationOpenFile({})
	
	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.primary,
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
				initialRouteName='(songs)'
			>
				
				<Tabs.Screen
					name="(songs)"
					options={{
						title: 'Songs',
						tabBarIcon: ({ color }) => (
							<Ionicons name="musical-notes-sharp" size={24} color={color} />
						),
						tabBarLabelPosition: 'beside-icon',
					}}
				/>
				<Tabs.Screen
					name="(clips)"
					options={{
						title: 'Clips',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name="playlist-play" size={28} color={color} />
						),
						tabBarLabelPosition: 'beside-icon',
					}}
				/>
			</Tabs>

			<PlayerControls />
		</>
	)
}

export default TabsNavigation
