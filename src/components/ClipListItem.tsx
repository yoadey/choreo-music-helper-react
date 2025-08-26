import { colors } from '@/constants/tokens'
import { useProgressWithRange } from '@/hooks/useProgressWithRange'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { getGlobalSpeedOnly, useLeadInDuration, useLoopEnd, useLoopStart } from '@/store/playbackState'
import { defaultStyles } from '@/styles'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableHighlight, TouchableHighlightProps, View } from 'react-native'
import TrackPlayer from 'react-native-track-player'

type ClipListItemProps = {
	index: number,
	clip: Clip,
	endPosition: number,
} & TouchableHighlightProps

export const ClipListItem = ({ index, clip, endPosition, ...props }: ClipListItemProps) => {
	const router = useRouter();
	const [leadInDuration, setLeadInDuration] = useLeadInDuration()
	const globalOnly = getGlobalSpeedOnly()
	const progress = useProgressWithRange({ start: clip.position, end: endPosition })
	const { showActionSheetWithOptions } = useActionSheet();
	const [loopStart, setLoopStart] = useLoopStart()
	const [loopEnd, setLoopEnd] = useLoopEnd()

	const toTime = (position: number) => {
		if (position < 0) return '0:00'
		const minutes = Math.floor(position / 60)
		const seconds = Math.floor(position % 60)
		const milliseconds = Math.floor(position * 10 % 10)
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${milliseconds}`
	}

	const handleClipPress = (clip: Clip) => {
		TrackPlayer.seekTo(Math.max(clip.position - (leadInDuration ?? 0), 0));
	}

	const handleClipLongPress = (clip: Clip) => {
		const options = ['Delete', 'Edit', 'Cancel'];
		const destructiveButtonIndex = 0;
		const cancelButtonIndex = 2;

		showActionSheetWithOptions({
			options,
			cancelButtonIndex,
			destructiveButtonIndex,
			containerStyle: {
				backgroundColor: colors.backgroundHighlighted,
			},
			textStyle: {
				color: colors.text,
			},
		}, (selectedIndex) => {
			switch (selectedIndex) {
				case 1:
					// Edit
					router.push(`/(modals)/edit?clipId=${clip.id}`);
					break;

				case destructiveButtonIndex:
					database.write(async () =>
						await database.get<Clip>('clips')
							.find(clip.id)
							.then(clip => clip?.destroyPermanently())
					);
					break;

				case cancelButtonIndex:
			}
		});
	}

	const toggleLoopStart = () => {
		if (loopStart?.id === clip.id) {
			setLoopStart(undefined)
		} else {
			setLoopStart({
				id: clip.id,
				position: clip.position
			})
		}
	}

	const toggleLoopEnd = () => {
		if (loopEnd?.id === clip.id) {
			setLoopEnd(undefined)
		} else {
			setLoopEnd({
				id: clip.id,
				position: endPosition
			})
		}
	}

	return (
		<TouchableHighlight activeOpacity={0.8} {...props}
			onPress={() => handleClipPress(clip)}
			onLongPress={() => handleClipLongPress(clip)}
			style={{ backgroundColor: clip.color! }}>
			<View style={[styles.cliplistItemContainer, { backgroundColor: clip.color! }]}>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						width: '100%',
						paddingLeft: 10,
						paddingRight: 10,
						paddingTop: 5,
						paddingBottom: 2,
					}}
				>
					<Text numberOfLines={1} style={styles.clipIndexText}>
						{index + 1}
					</Text>
					<View style={{ flex: 1, width: "100%" }} >
						<Text numberOfLines={1} style={styles.clipTitleText}>
							{clip.title || 'Untitled Clip'}
						</Text>
						<Text numberOfLines={1} style={styles.clipPositionText}>
							{toTime(clip.position) || '0:00'}
							{!globalOnly && clip.speed && clip.speed !== 1 &&
								` \u2022 ${clip.speed.toFixed(2)}x`
							}
						</Text>
					</View>
					<TouchableHighlight style={loopStart?.id === clip.id ? styles.loopActiveButton : styles.loopButton} onPress={toggleLoopStart}>
						<Text style={styles.buttonText}>A</Text>
					</TouchableHighlight>
					<TouchableHighlight style={loopEnd?.id === clip.id ? styles.loopActiveButton : styles.loopButton} onPress={toggleLoopEnd}>
						<Text style={styles.buttonText}>B</Text>
					</TouchableHighlight>
				</View>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						backgroundColor: progress >= 0 ? colors.maximumTrackTintColor : clip.color!,
						width: '100%',
						height: 3
					}}
				>
					{progress >= 0 ?
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								backgroundColor: colors.minimumTrackTintColor,
								width: `${(progress - clip.position) / (endPosition - clip.position) * 100}%`,
								height: '100%',
							}}
						/> : <></>
					}
				</View>
			</View>
		</TouchableHighlight>
	)
}

const styles = StyleSheet.create({
	cliplistItemContainer: {
		columnGap: 14,
		alignItems: 'flex-start',
		width: '100%',
	},
	clipIndexText: {
		...defaultStyles.text,
		textAlign: "center",
		fontSize: 32,
		fontWeight: '600',
		maxWidth: '100%',
		minWidth: 40,
		paddingRight: 10,
	},
	clipTitleText: {
		...defaultStyles.text,
		fontSize: 17,
		fontWeight: '600',
		maxWidth: '80%',
	},
	clipPositionText: {
		...defaultStyles.text,
		fontSize: 15,
		fontWeight: '400',
		color: colors.textMuted,
	},
	loopButton: {
		backgroundColor: colors.secondary,
		width: 35,
		height: 35,
		marginHorizontal: 4,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loopActiveButton: {
		backgroundColor: colors.primary,
		width: 35,
		height: 35,
		marginHorizontal: 4,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		color: '#fff',
		fontWeight: 600,
		fontSize: 24,
	},
	strike: {
		textDecorationLine: 'line-through'
	}
})
