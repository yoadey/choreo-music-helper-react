import { PlayPauseButton, SkipToNextButton, SkipToPreviousButton, StopButton } from '@/components/PlayerControls'
import { useLastActiveTrack } from '@/hooks/useLastActiveTrack'
import { useRouter } from 'expo-router'
import { StyleSheet, TouchableOpacity, View, ViewProps } from 'react-native'
import { useActiveTrack } from 'react-native-track-player'
import { PlayerProgressBar } from './PlayerProgressbar'

export const Player = ({ style }: ViewProps) => {
	const router = useRouter()

	const activeTrack = useActiveTrack()
	const lastActiveTrack = useLastActiveTrack()

	const displayedTrack = activeTrack ?? lastActiveTrack

	return (
		<TouchableOpacity activeOpacity={0.9} style={[styles.container, style]}>
			<>
				<View>
					<View style={styles.trackControlsContainer}>
						<SkipToPreviousButton iconSize={22} />
						<StopButton iconSize={22} />
						<PlayPauseButton iconSize={38} />
						<SkipToNextButton iconSize={22} />
					</View>
					<PlayerProgressBar style={{ marginTop: 32 }} />
					<View style={styles.trackControlsContainer}>
						<SkipToPreviousButton iconSize={22} />
						<StopButton iconSize={22} />
						<PlayPauseButton iconSize={38} />
						<SkipToNextButton iconSize={22} />
					</View>
				</View>
			</>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#252525',
		padding: 8,
		paddingVertical: 10,
		justifyContent: 'center',
	},
	trackControlsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		columnGap: 20,
		marginRight: 16,
		paddingLeft: 16,
	},
})
