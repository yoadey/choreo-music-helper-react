import { colors } from '@/constants/tokens'
import { pausePlayback, skipToNextClip, skipToPreviousClip, stopPlayback } from '@/constants/playbackService'
import { playCurrentTrack } from '@/helpers/player'
import { useGlobalSpeedOnly, useLeadInDuration, useLeadOutDuration, useSpeed } from '@/store/playbackState'
import { ControlsSide, usePlayerLayout } from '@/store/settings'
import { useLoopStatusStore } from '@/store/store'
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import { useIsPlaying } from 'react-native-track-player'
import { PlayerAddClipButton } from './PlayerAddClipButton'
import { PlayerProgressBar } from './PlayerProgressbar'

type PlayerControlsProps = {
	style?: ViewStyle
	/** Landscape format: side of the screen on which the controls are shown next to the lists */
	side?: ControlsSide | null
}

type PlayerButtonProps = {
	style?: ViewStyle
	buttonStyle?: ViewStyle
	iconSize?: number
}

export const PlayerControls = ({ style, side }: PlayerControlsProps) => {
	const [layout] = usePlayerLayout()
	const containerStyle = [
		styles.container,
		side === 'right' && [styles.sidePanel, styles.sidePanelRight],
		side === 'left' && [styles.sidePanel, styles.sidePanelLeft],
		style,
	]
	const compact = layout === 'compact'
	// Compact: one row of smaller buttons for small screens
	const iconSize = compact ? 24 : 30
	const buttonStyle = compact ? styles.compactButton : styles.button
	const transport = (
		<>
			<TouchableOpacity
				activeOpacity={0.7}
				onPress={skipToPreviousClip}
				style={buttonStyle}
				accessibilityRole="button"
				accessibilityLabel="Previous clip"
			>
				<FontAwesome6 name="backward" size={iconSize} color={colors.text} />
			</TouchableOpacity>

			<TouchableOpacity
				activeOpacity={0.7}
				onPress={stopPlayback}
				style={buttonStyle}
				accessibilityRole="button"
				accessibilityLabel="Stop"
			>
				<FontAwesome6 name="stop" size={iconSize} color={colors.text} />
			</TouchableOpacity>

			<PlayPauseButton iconSize={compact ? 38 : 48} buttonStyle={buttonStyle} />

			<TouchableOpacity
				activeOpacity={0.7}
				onPress={skipToNextClip}
				style={buttonStyle}
				accessibilityRole="button"
				accessibilityLabel="Next clip"
			>
				<FontAwesome6 name="forward" size={iconSize} color={colors.text} />
			</TouchableOpacity>
		</>
	)

	if (compact) {
		return (
			<View style={containerStyle} testID="player-compact">
				<PlayerProgressBar style={{ marginTop: 6, paddingHorizontal: 10 }} />
				<View style={styles.row}>
					<LoopButton iconSize={26} buttonStyle={buttonStyle} />
					{transport}
					<PlayerAddClipButton size={28} buttonStyle={buttonStyle} />
					<SpeedButton iconSize={26} buttonStyle={buttonStyle} />
				</View>
			</View>
		)
	}

	return (
		<View style={containerStyle} testID={side ? 'player-side' : undefined}>
			<View style={styles.row}>
				<LoopButton />
				<PlayerAddClipButton size={32} buttonStyle={styles.button} />
				<SpeedButton />
			</View>
			<PlayerProgressBar style={{ marginTop: 10, paddingHorizontal: 10 }} />
			<View style={styles.row}>{transport}</View>
		</View>
	)
}

export const PlayPauseButton = ({ style, buttonStyle = styles.button, iconSize = 48 }: PlayerButtonProps) => {
	const { playing } = useIsPlaying()

	return (
		<View style={style}>
			<TouchableOpacity
				activeOpacity={0.85}
				style={buttonStyle}
				onPress={() => (playing ? pausePlayback() : playCurrentTrack())}
				accessibilityRole="button"
				accessibilityLabel={playing ? 'Pause' : 'Play'}
			>
				<FontAwesome6 name={playing ? 'pause' : 'play'} size={iconSize} color={colors.text} />
			</TouchableOpacity>
		</View>
	)
}

export const LoopButton = ({ buttonStyle = styles.button, iconSize = 30 }: PlayerButtonProps) => {
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
			style={buttonStyle}
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

export const SpeedButton = ({ buttonStyle = styles.button, iconSize = 30 }: PlayerButtonProps) => {
	const router = useRouter()
	const [speed] = useSpeed()
	const [globalOnly] = useGlobalSpeedOnly()
	const currentSpeed = speed ?? 1
	const highlightColor = currentSpeed !== 1 || globalOnly ? colors.primary : colors.icon
	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={() => router.push('/(modals)/speed')}
			style={buttonStyle}
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
	// Next to the lists: full height, the controls vertically centered
	sidePanel: {
		width: '42%',
		minWidth: 260,
		maxWidth: 440,
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 8,
		borderColor: colors.backgroundHighlighted,
	},
	sidePanelRight: {
		borderLeftWidth: 1,
	},
	sidePanelLeft: {
		borderRightWidth: 1,
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
	compactButton: {
		paddingVertical: 6,
		paddingHorizontal: 4,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonLabel: {
		marginTop: 2,
		fontSize: 13,
	},
})
