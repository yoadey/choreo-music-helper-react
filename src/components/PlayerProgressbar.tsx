import { colors, fontSize } from '@/constants/tokens'
import { formatSecondsToMinutes } from '@/helpers/miscellaneous'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { defaultStyles } from '@/styles'
import { StyleSheet, Text, View, ViewProps } from 'react-native'
import TrackPlayer, { useActiveTrack, useProgress } from 'react-native-track-player'
import WaveformView from './waveform/WaveformView'

export const PlayerProgressBar = ({ style }: ViewProps) => {
	const { duration, position } = useProgress(50)
	const track = useActiveTrack()
	const { currentTrack } = useCurrentTrack()

	const trackElapsedTime = formatSecondsToMinutes(position)
	const trackRemainingTime = formatSecondsToMinutes(duration - position)

	return (
		<View style={style}>
			<WaveformView
				mp3Url={track?.url}
				progress={position}
				duration={duration}
				onSeek={(newProgress) => TrackPlayer.seekTo(newProgress)}
				elapsedBarColor={colors.minimumTrackTintColor}
				remainingBarColor={colors.maximumTrackTintColor}
				trackId={currentTrack?.id}
			/>

			<View style={styles.timeRow}>
				<Text id="elapsedTime" style={styles.timeText}>{trackElapsedTime}</Text>

				<Text id="remainingTime" style={styles.timeText}>
					{'-'} {trackRemainingTime}
				</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	timeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		marginTop: 10,
	},
	timeText: {
		...defaultStyles.text,
		color: colors.text,
		opacity: 0.75,
		fontSize: fontSize.xs,
		letterSpacing: 0.7,
		fontWeight: '500',
		paddingHorizontal: 10,
	},
})
