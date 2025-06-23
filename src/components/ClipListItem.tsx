import { colors } from '@/constants/tokens'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { defaultStyles } from '@/styles'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableHighlight, TouchableHighlightProps, View } from 'react-native'
import TrackPlayer from 'react-native-track-player'

type ClipListItemProps = {
	clip: Clip
} & TouchableHighlightProps

export const ClipListItem = ({ clip, ...props }: ClipListItemProps) => {
	const router = useRouter();
	const { showActionSheetWithOptions } = useActionSheet();

	const toTime = (position: number) => {
		if (position < 0) return '0:00'
		const minutes = Math.floor(position / 60)
		const seconds = Math.floor(position % 60)
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
	}

	const handleClipPress = (clip: Clip) => {
		TrackPlayer.seekTo(clip.position);
	}

	const handleClipLongPress = (clip: Clip) => {
		const options = ['Delete', 'Edit', 'Cancel'];
		const destructiveButtonIndex = 0;
		const cancelButtonIndex = 2;

		showActionSheetWithOptions({
			options,
			cancelButtonIndex,
			destructiveButtonIndex
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

	return (
		<TouchableHighlight activeOpacity={0.8} {...props}
			onPress={() => handleClipPress(clip)}
			onLongPress={() => handleClipLongPress(clip)}
			style={{backgroundColor: clip.color!}}>
			<View style={[styles.cliplistItemContainer, { backgroundColor: clip.color! }]}>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						width: '100%',
					}}
				>
					<View style={{ flex: 1, width: "100%" }} >
						<Text numberOfLines={1} style={styles.clipTitleText}>
							{clip.title || 'Untitled Clip'}
						</Text>
						<Text numberOfLines={1} style={styles.clipPositionText}>
							{toTime(clip.position) || '0:00'}
						</Text>
					</View>
					<TouchableHighlight style={styles.loopButton}>
						<Text style={styles.buttonText}>A</Text>
					</TouchableHighlight>
					<TouchableHighlight style={styles.loopButton}>
						<Text style={styles.buttonText}>B</Text>
					</TouchableHighlight>
				</View>
			</View>
		</TouchableHighlight>
	)
}

const styles = StyleSheet.create({
	cliplistItemContainer: {
		columnGap: 14,
		alignItems: 'center',
		paddingRight: 90,
		width: '100%',
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
		maxWidth: '20%',
	},
	loopButton: {
		backgroundColor: colors.primary,
		paddingVertical: 6,
		paddingHorizontal: 12,
		marginHorizontal: 4,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 18,
	},
})
