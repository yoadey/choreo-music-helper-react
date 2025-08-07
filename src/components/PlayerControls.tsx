import { colors } from '@/constants/tokens'
import { useCurrentTrack } from '@/hooks/useCurrentTrack'
import Clip from '@/model/clip'
import { useLeadInDuration, useLeadOutDuration, useSpeed } from '@/store/playbackState'
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import TrackPlayer, { useIsPlaying } from 'react-native-track-player'
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

	const { currentTrack } = useCurrentTrack()
	const [clips, setClips] = useState<Clip[]>([]);

	useMemo(() => {
		currentTrack?.clips.observeWithColumns(['position']).subscribe((clips) => {
			const sortedClips = clips.sort((a, b) => {
				if (a.position < b.position) return -1;
				if (a.position > b.position) return 1;
				return 0;
			});
			setClips(sortedClips);
		})
	}, [currentTrack?.id])

	const handlePrevious = () => {
		if (!currentTrack) return;

		TrackPlayer.getProgress()
			.then(progress => {
				for (let index = 0; index < clips.length - 1; index++) {
					if (clips[index].position <= progress.position && clips[index + 1].position > progress.position) {
						TrackPlayer.seekTo(clips[index - 1].position);
						break;
					}
				}
			});
	}
	const handleNext = () => {
		if (!currentTrack) return;

		TrackPlayer.getProgress()
			.then(progress => {
				for (let index = 0; index < clips.length - 1; index++) {
					if (clips[index].position <= progress.position && clips[index + 1].position > progress.position) {
						TrackPlayer.seekTo(clips[index + 1].position);
						break;
					}
				}
			});
	}
	return (
		<View style={[styles.container, style]}>
			<View style={styles.row}>

				<LoopButton />

				<PlayerAddClipButton size={32} />

				<SpeedButton />
			</View>
			<PlayerProgressBar style={{ marginTop: 10, paddingHorizontal: 10 }} />
			<View style={styles.row}>
				<TouchableOpacity activeOpacity={0.7} onPress={handlePrevious} style={[styles.button]}>
					<FontAwesome6 name={'backward'} size={30} color={colors.text} />
				</TouchableOpacity>

				<TouchableOpacity activeOpacity={0.7} onPress={() => TrackPlayer.stop()} style={[styles.button]}>
					<FontAwesome6 name="stop" size={30} color={colors.text} />
				</TouchableOpacity>
				<PlayPauseButton />

				<TouchableOpacity activeOpacity={0.7} onPress={handleNext} style={[styles.button]}>
					<FontAwesome6 name="forward" size={30} color={colors.text} />
				</TouchableOpacity>
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


export const LoopButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	const router = useRouter()
	const [leadInDuration] = useLeadInDuration()
	const [leadOutDuration] = useLeadOutDuration()
	const highlightColor = leadInDuration && leadInDuration !== 0 ? colors.primary : colors.icon;
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(modals)/loop')} style={[styles.button]}>
			<MaterialCommunityIcons
				name={'clock-plus-outline'}
				color={highlightColor}
				size={iconSize}
			/>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				{leadInDuration && leadInDuration !== 0 ?
					<Text
						style={{
							marginTop: 2,
							fontSize: 13,
							color: highlightColor,
						}}
					>
						-{leadInDuration}s
					</Text>
					: <></>
				}
				<Text>&nbsp;</Text>
				{leadOutDuration && leadOutDuration !== 0 ?
					<Text
						style={{
							marginTop: 2,
							fontSize: 13,
							color: highlightColor,
						}}
					>
						+{leadOutDuration}s
					</Text>
					: <></>
				}
			</View>
		</TouchableOpacity>
	)
}

export const SpeedButton = ({ iconSize = 30 }: PlayerButtonProps) => {
	const router = useRouter()
	const [speed, setSpeed] = useSpeed()
	const highlightColor = speed && speed !== 1 ? colors.primary : colors.icon;
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(modals)/speed')} style={[styles.button]}>
			<MaterialCommunityIcons
				name={'speedometer'}
				color={highlightColor}
				size={iconSize}
			/>
			<Text
				style={{
					marginTop: 2,
					fontSize: 13,
					color: highlightColor,
				}}
			>
				{speed ? speed.toFixed(2) + 'x' : '1.00x'}
			</Text>
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
		verticalAlign: 'middle',
		alignItems: 'center',
	}
})
