import { PlayerControls } from '@/components/PlayerControls'
import { colors, fontSize } from '@/constants/tokens'
import { useControlsSide } from '@/hooks/useControlsSide'
import { useNavigationOpenFile } from '@/hooks/useNavigationOpenFile'
import { t } from '@/i18n'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TabsNavigation = () => {
	useNavigationOpenFile()
	// Landscape format: the controls on one side, the lists on the other
	const controlsSide = useControlsSide()
	// Rotated phones: not below the notch or the rounded corners at the sides (the header keeps clear of them itself)
	const { left, right } = useSafeAreaInsets()

	return (
		<View
			style={[
				styles.container,
				controlsSide === 'right' && styles.row,
				controlsSide === 'left' && styles.rowReverse,
				{ paddingLeft: left, paddingRight: right },
			]}
		>
			<View style={styles.lists}>
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
			</View>

			<PlayerControls side={controlsSide} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		// Also below the safe area padding
		backgroundColor: colors.background,
	},
	row: {
		flexDirection: 'row',
	},
	rowReverse: {
		flexDirection: 'row-reverse',
	},
	lists: {
		flex: 1,
		minWidth: 0,
	},
})

export default TabsNavigation
