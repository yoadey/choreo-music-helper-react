import { colors } from '@/constants/tokens'
import { seekToClip } from '@/constants/playbackService'
import { removeClip } from '@/helpers/clips'
import { confirmAction, showMessage } from '@/helpers/dialogs'
import { formatClipTime } from '@/helpers/miscellaneous'
import { t } from '@/i18n'
import Clip from '@/model/clip'
import { setLoopEnd, setLoopStart } from '@/store/playbackState'
import { defaultStyles } from '@/styles'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native'

type ClipListItemProps = {
	index: number
	clip: Clip
	// The record is mutated in place on updates, so the displayed values are passed explicitly for memo
	title: string
	position: number
	color: string
	speed: number | null
	/** Progress inside the clip (0–1) or -1 if the clip is not playing */
	progress: number
	showSpeed: boolean
	isLoopStart: boolean
	isLoopEnd: boolean
	/** Both markers are set but do not form a valid loop */
	loopInvalid: boolean
}

export const ClipListItem = memo(function ClipListItem({
	index,
	clip,
	title,
	position,
	color,
	speed,
	progress,
	showSpeed,
	isLoopStart,
	isLoopEnd,
	loopInvalid,
}: ClipListItemProps) {
	const router = useRouter()
	const { showActionSheetWithOptions } = useActionSheet()
	const displayTitle = title || t.untitledClip

	const handleLongPress = () => {
		const options = [t.delete, t.edit, t.cancel]
		showActionSheetWithOptions(
			{
				options,
				cancelButtonIndex: 2,
				destructiveButtonIndex: 0,
				containerStyle: { backgroundColor: colors.backgroundHighlighted },
				textStyle: { color: colors.text },
			},
			async (selectedIndex) => {
				if (selectedIndex === 1) {
					router.push(`/(modals)/edit-clip?clipId=${clip.id}`)
				} else if (selectedIndex === 0 && (await confirmAction(t.confirmDeleteClip(displayTitle)))) {
					try {
						await removeClip(clip)
					} catch (error) {
						console.warn('Could not delete the clip', error)
						showMessage(t.clipDeleteFailed)
					}
				}
			},
		)
	}

	const markerStyle = (selected: boolean) =>
		!selected ? styles.loopButton : loopInvalid ? styles.loopInvalidButton : styles.loopActiveButton
	const markerLabel = (name: string, selected: boolean) =>
		`${name} ${index + 1}${selected && loopInvalid ? ' (inactive)' : ''}`

	const toggleLoopStart = () => setLoopStart(isLoopStart ? undefined : { id: clip.id })
	const toggleLoopEnd = () => setLoopEnd(isLoopEnd ? undefined : { id: clip.id })

	return (
		<TouchableHighlight
			activeOpacity={0.8}
			onPress={() => seekToClip(position)}
			onLongPress={handleLongPress}
			style={{ backgroundColor: color }}
			testID={`clip-${index}`}
		>
			<View style={[styles.container, { backgroundColor: color }]}>
				<View style={styles.row}>
					<Text numberOfLines={1} style={styles.indexText}>
						{index + 1}
					</Text>
					<View style={{ flex: 1 }}>
						<Text numberOfLines={1} style={styles.titleText}>
							{displayTitle}
						</Text>
						<Text numberOfLines={1} style={styles.positionText}>
							{formatClipTime(position)}
							{showSpeed && speed != null && speed !== 1 && ` • ${speed.toFixed(2)}x`}
						</Text>
					</View>
					<TouchableHighlight
						style={markerStyle(isLoopStart)}
						onPress={toggleLoopStart}
						accessibilityRole="button"
						accessibilityLabel={markerLabel('Loop start', isLoopStart)}
						accessibilityState={{ selected: isLoopStart }}
					>
						<Text style={styles.buttonText}>A</Text>
					</TouchableHighlight>
					<TouchableHighlight
						style={markerStyle(isLoopEnd)}
						onPress={toggleLoopEnd}
						accessibilityRole="button"
						accessibilityLabel={markerLabel('Loop end', isLoopEnd)}
						accessibilityState={{ selected: isLoopEnd }}
					>
						<Text style={styles.buttonText}>B</Text>
					</TouchableHighlight>
				</View>
				<View style={[styles.progressTrack, { backgroundColor: progress >= 0 ? colors.maximumTrackTintColor : color }]}>
					{progress >= 0 && <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />}
				</View>
			</View>
		</TouchableHighlight>
	)
})

const loopButtonBase = {
	width: 35,
	height: 35,
	marginHorizontal: 4,
	borderRadius: 6,
	alignItems: 'center',
	justifyContent: 'center',
} as const

const styles = StyleSheet.create({
	container: {
		alignItems: 'flex-start',
		width: '100%',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		paddingHorizontal: 10,
		paddingTop: 5,
		paddingBottom: 2,
	},
	indexText: {
		...defaultStyles.text,
		textAlign: 'center',
		fontSize: 32,
		fontWeight: '600',
		minWidth: 40,
		paddingRight: 10,
	},
	titleText: {
		...defaultStyles.text,
		fontSize: 17,
		fontWeight: '600',
	},
	positionText: {
		...defaultStyles.text,
		fontSize: 15,
		fontWeight: '400',
		color: colors.textMuted,
	},
	loopButton: {
		...loopButtonBase,
		backgroundColor: colors.secondary,
	},
	loopActiveButton: {
		...loopButtonBase,
		backgroundColor: colors.primary,
	},
	loopInvalidButton: {
		...loopButtonBase,
		backgroundColor: colors.secondary,
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: colors.primary,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 24,
	},
	progressTrack: {
		width: '100%',
		height: 3,
	},
	progressBar: {
		height: '100%',
		backgroundColor: colors.minimumTrackTintColor,
	},
})
