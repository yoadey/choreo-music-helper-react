import { PlayerControls } from '@/components/PlayerControls'
import { colors, fontSize } from '@/constants/tokens'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

const TabsNavigation = () => {
	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.primary,
					tabBarLabelStyle: {
						fontSize: fontSize.xs,
						fontWeight: '500',
					},
					headerShown: false,
					tabBarStyle: {
						position: 'absolute',
						borderTopWidth: 0,
						paddingTop: 8,
						backgroundColor: '#252525',
					},
				}}
			>
				<Tabs.Screen
					name="(songs)"
					options={{
						title: 'Songs',
						tabBarIcon: ({ color }) => (
							<Ionicons name="musical-notes-sharp" size={24} color={color} />
						),
					}}
				/>
				<Tabs.Screen
					name="playlists"
					options={{
						title: 'Clips',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name="playlist-play" size={28} color={color} />
						),
					}}
				/>
			</Tabs>

			<PlayerControls />
		</>
	)
}

export default TabsNavigation
