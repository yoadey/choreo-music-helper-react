import { colors } from '@/constants/tokens'
import { pausePlayback, skipToNextClip, skipToPreviousClip, stopPlayback } from '@/constants/playbackService'
import { playCurrentTrack } from '@/helpers/player'
import { useGlobalSpeedOnly, useLeadInDuration, useLeadOutDuration, useSpeed } from '@/store/playbackState'
import { useLoopStatusStore } from '@/store/store'
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import { useIsPlaying } from 'react-native-track-player'
import { PlayerAddClipButton } from './PlayerAddClipButton'
import { PlayerProgressBar } from './PlayerProgressbar'

type PlayerControlsProps = {
	style?: ViewStyle
}

type PlayerButtonProps = {
	style?: ViewStyle
	iconSize?: number
}

export const PlayerControls = ({ style }: PlayerControlsProps) => {
	return (
		<View style={[styles.container, style]}>
			<View style={styles.row}>
				<LoopButton />
				<PlayerAddClipButton size={32} />
				<SpeedButton />
			</View>
			<PlayerProgressBar style={{ marginTop: 10, paddingHorizontal: 10 }} />
			<View style={styles.row}>
				<TouchableOpacity
					activeOpacity={0.7}
					onPress={skipToPreviousClip}
					style={styles.button}
					accessibilityRole="button"
					accessibilityLabel="Previous clip"
				>
					<FontAwesome6 name="backward" size={30} color={colors.text} />
				</TouchableOpacity>

				<TouchableOpacity
					activeOpacity={0.7}
					onPress={stopPlayback}
					style={styles.button}
					accessibilityRole="button"
					accessibilityLabel="Stop"
				>
					<FontAwesome6 name="stop" size={30} color={colors.text} />
				</TouchableOpacity>

				<PlayPauseButton />

				<TouchableOpacity
					activeOpacity={0.7}
					onPress={skipToNextClip}
					style={styles.button}
					accessibilityRole="button"
					accessibilityLabel="Next clip"
				>
					<FontAwesome6 name="forward" size={30} color={colors.text} />
				</TouchableOpacity>
			</View>
		</View>
	)
}

export const PlayPauseButton = ({ style, iconSize = 48 }: PlayerButtonProps) => {
	const { playing } = useIsPlaying()

	return (
		<View style={style}>
			<TouchableOpacity
				activeOpacity={0.85}
				style={styles.button}
				onPress={() => (playing ? pausePlayback() : playCurrentTrack())}
				accessibilityRole="button"
				accessibilityLabel={playing ? 'Pause' : 'Play'}
			>
				<FontAwesome6 name={playing ? 'pause' : 'play'} size={iconSize} color={colors.text} />
			</TouchableOpacity>
		</View>
	)
}

export const LoopButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	const router = useRouter()
	const [leadInDuration] = useLeadInDuration()
	const [leadOutDuration] = useLeadOutDuration()
	const loopActive = useLoopStatusStore((state) => state.active)
	const hasLeadTimes = !!leadInDuration || !!leadOutDuration
	const highlightColor = hasLeadTimes || loopActive ? colors.primary : colors.icon
	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={() => router.push('/(modals)/loop')}
			style={styles.button}
			accessibilityRole="button"
			accessibilityLabel="Preparation time"
		>
			<MaterialCommunityIcons name="clock-plus-outline" color={highlightColor} size={iconSize} />
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
				{!!leadInDuration && <Text style={[styles.buttonLabel, { color: highlightColor }]}>-{leadInDuration}s</Text>}
				{!!leadOutDuration && <Text style={[styles.buttonLabel, { color: highlightColor }]}>+{leadOutDuration}s</Text>}
			</View>
		</TouchableOpacity>
	)
}

export const SpeedButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	const router = useRouter()
	const [speed] = useSpeed()
	const [globalOnly] = useGlobalSpeedOnly()
	const currentSpeed = speed ?? 1
	const highlightColor = currentSpeed !== 1 || globalOnly ? colors.primary : colors.icon
	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={() => router.push('/(modals)/speed')}
			style={styles.button}
			accessibilityRole="button"
			accessibilityLabel="Speed"
		>
			<MaterialCommunityIcons name="speedometer" color={highlightColor} size={iconSize} />
			<Text style={[styles.buttonLabel, { color: highlightColor }]}>{currentSpeed.toFixed(2)}x</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		backgroundColor: colors.backgroundSecondary,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		alignItems: 'center',
	},
	button: {
		padding: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonLabel: {
		marginTop: 2,
		fontSize: 13,
	},
})
