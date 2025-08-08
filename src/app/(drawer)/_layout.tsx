import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { Drawer } from 'expo-router/drawer'

const DrawerNavigator = () => {
	const { currentTrack } = useCurrentTrack()
	return (
		<Drawer>
			<Drawer.Screen name="(tabs)" options={{
				title: `Music Player`,
				headerShown: true,
				headerLargeTitleStyle: {
					color: colors.text,
				},
				headerTitle: `${currentTrack ? currentTrack?.title + " - " : ""}Choreo Music Helper`,
				headerStyle: { backgroundColor: colors.backgroundSecondary },
				headerTintColor: colors.text,
				headerTransparent: false,
				headerBlurEffect: 'prominent',
				headerShadowVisible: false,
				drawerStyle: {
					backgroundColor: colors.backgroundHighlighted,
				},
				drawerActiveBackgroundColor: colors.maximumTrackTintColor,
				drawerLabelStyle: {
					color: colors.text,
				}
			}} />
			<Drawer.Screen name="info" options={{
				title: `Info`,
				headerShown: true,
				headerLargeTitleStyle: {
					color: colors.text,
				},
				headerStyle: { backgroundColor: colors.backgroundSecondary },
				headerTintColor: colors.text,
				headerTransparent: false,
				headerBlurEffect: 'prominent',
				headerShadowVisible: false,
				drawerStyle: {
					backgroundColor: colors.backgroundHighlighted,
				},
				drawerActiveBackgroundColor: colors.maximumTrackTintColor,
				drawerLabelStyle: {
					color: colors.text,
				}
			}} />
		</Drawer>
	)
}

export default DrawerNavigator