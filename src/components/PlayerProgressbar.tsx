import { colors, fontSize } from '@/constants/tokens'
import { formatSecondsToMinutes } from '@/helpers/miscellaneous'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import { useWaveform } from '@/hooks/useWaveform'
import { defaultStyles } from '@/styles'
import { StyleSheet, Text, View, ViewProps } from 'react-native'
import { usePlayerProgressStore } from '@/store/progress'
import { seekTo } from '@/constants/playbackService'
import WaveformView from './waveform/WaveformView'

export const PlayerProgressBar = ({ style }: ViewProps) => {
	const position = usePlayerProgressStore((progress) => progress.position)
	const duration = usePlayerProgressStore((progress) => progress.duration)
	const { currentTrack } = useCurrentTrack()
	const waveform = useWaveform(currentTrack)

	return (
		<View style={style}>
			<WaveformView
				waveform={currentTrack ? waveform : []}
				progress={position}
				duration={duration}
				onSeek={seekTo}
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
