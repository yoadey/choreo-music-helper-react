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
			<View style={styles.container}>
				<WaveformView
					waveform={currentTrack ? waveform : []}
					progress={position}
					duration={duration}
					onSeek={seekTo}
					elapsedBarColor={colors.minimumTrackTintColor}
					remainingBarColor={colors.maximumTrackTintColor}
				/>

				{/* On top of the waveform, which can still be dragged behind them */}
				<View style={styles.timeRow}>
					<Text testID="elapsed-time" style={styles.timeText}>
						{formatSecondsToMinutes(position)}
					</Text>
					<Text testID="remaining-time" style={styles.timeText}>
						- {formatSecondsToMinutes(duration - position)}
					</Text>
				</View>
			</View>
		</View>
	)
}

// Readable on top of the bars: dark outline around the light text and a translucent background, through
// which the waveform is still visible
const textShadow = {
	textShadowColor: 'rgba(0, 0, 0, 1)',
	textShadowOffset: { width: 0, height: 0 },
	textShadowRadius: 3,
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		justifyContent: 'center',
	},
	timeRow: {
		...StyleSheet.absoluteFill,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		pointerEvents: 'none',
	},
	timeText: {
		...defaultStyles.text,
		...textShadow,
		color: colors.text,
		fontSize: fontSize.xs,
		letterSpacing: 0.7,
		fontWeight: '600',
		paddingHorizontal: 5,
		paddingVertical: 1,
		borderRadius: 6,
		overflow: 'hidden',
		backgroundColor: 'rgba(28, 28, 30, 0.55)',
	},
})
