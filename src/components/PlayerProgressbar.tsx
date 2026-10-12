import { colors, fontSize } from '@/constants/tokens'
import { formatSecondsToMinutes } from '@/helpers/miscellaneous'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { useWaveform } from '@/hooks/useWaveform'
import { defaultStyles } from '@/styles'
import { StyleSheet, Text, View, ViewProps } from 'react-native'
import TrackPlayer, { useProgress } from 'react-native-track-player'
import WaveformView from './waveform/WaveformView'

export const PlayerProgressBar = ({ style }: ViewProps) => {
	const { duration, position } = useProgress(50)
	const { currentTrack } = useCurrentTrack()
	const waveform = useWaveform(currentTrack)

	return (
		<View style={style}>
			<WaveformView
				waveform={currentTrack ? waveform : []}
				progress={position}
				duration={duration}
				onSeek={(newProgress) => TrackPlayer.seekTo(newProgress)}
				elapsedBarColor={colors.minimumTrackTintColor}
				remainingBarColor={colors.maximumTrackTintColor}
			/>

			<View style={styles.timeRow}>
				<Text testID="elapsed-time" style={styles.timeText}>
					{formatSecondsToMinutes(position)}
				</Text>
				<Text testID="remaining-time" style={styles.timeText}>
					- {formatSecondsToMinutes(duration - position)}
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
