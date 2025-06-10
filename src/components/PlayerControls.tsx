import { colors } from '@/constants/tokens'
import { FontAwesome6 } from '@expo/vector-icons'
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import TrackPlayer, { useIsPlaying } from 'react-native-track-player'
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
				<SkipToPreviousButton iconSize={22} />
				<StopButton iconSize={22} />
				<PlayPauseButton iconSize={38} />
				<SkipToNextButton iconSize={22} />
			</View>
			<PlayerProgressBar style={{ marginTop: 32 }} />
			<View style={styles.row}>
				<SkipToPreviousButton />

				<StopButton />
				<PlayPauseButton />

				<SkipToNextButton />
			</View>
		</View>
	)
}

export const PlayPauseButton = ({ style, iconSize = 48 }: PlayerButtonProps) => {
	const { playing } = useIsPlaying()

	return (
		<View style={[style]}>
			<TouchableOpacity
				activeOpacity={0.85}
				style={[styles.button]}
				onPress={playing ? TrackPlayer.pause : TrackPlayer.play}
			>
				<FontAwesome6 name={playing ? 'pause' : 'play'} size={iconSize} color={colors.text} />
			</TouchableOpacity>
		</View>
	)
}

export const StopButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={() => TrackPlayer.stop()} style={[styles.button]}>
			<FontAwesome6 name="stop" size={iconSize} color={colors.text} />
		</TouchableOpacity>
	)
}

export const SkipToNextButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={() => TrackPlayer.skipToNext()} style={[styles.button]}>
			<FontAwesome6 name="forward" size={iconSize} color={colors.text} />
		</TouchableOpacity>
	)
}

export const SkipToPreviousButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={() => TrackPlayer.skipToPrevious()} style={[styles.button]}>
			<FontAwesome6 name={'backward'} size={iconSize} color={colors.text} />
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		backgroundColor: '#252525',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
		alignItems: 'center',
	},
	button: {
		padding: 10,
	}
})
