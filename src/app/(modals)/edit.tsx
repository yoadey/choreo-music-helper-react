import { colors, screenPadding } from '@/constants/tokens'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { defaultStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { CirclePicker } from 'react-color'
import { Button, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const colorSwatches = [
	"#121212",
	"#827717",
	"#BF360C",
	"#880E4F",
	"#B71C1C",
	"#004D40",
	"#33691E",
	"#1B5E20",
	"#006064",
	"#01579B",
	"#0D47A1",
	"#1A237E",
	"#311B92",
	"#4A148C",
	"#263238",
	"#3E2723",
]

const colorSwatchesSelected = [
    "#FFFFFF",
    "#AFB42B",
    "#E64A19",
    "#C2185B",
    "#D32F2F",
    "#00796B",
    "#689F38",
    "#388E3C",
    "#0097A7",
    "#0288D1",
    "#1976D2",
    "#303F9F",
    "#512DA8",
    "#7B1FA2",
    "#455A64",
    "#5D4037",
]


const EditClipModal = ({ clip }: { clip: Clip }) => {
	const router = useRouter()
	const headerHeight = useHeaderHeight()

	const [title, setTitle] = useState(clip.title);
	const [position, setPosition] = useState(clip.position)
	const [color, setColor] = useState(clip.color)

	useEffect(() => {
		setTitle(clip.title)
		setPosition(clip.position)
		setColor(clip.color)
	}, [clip])

	const handleOk = async () => {
		database.write(async () =>
			await clip.update(clipUpdate => {
				clipUpdate.title = title;
				clipUpdate.position = position;
				clipUpdate.color = color;
			})
		);
		router.dismiss()
	}

	const handleCancel = () => {
		router.dismiss()
	}

	return (
		<View style={[styles.modalContainer, { paddingTop: headerHeight }]}>
			<Pressable style={styles.backdrop} onPress={handleCancel} />

			<View style={styles.modal}>
				<Text style={styles.title}>Clip bearbeiten</Text>
				<View style={styles.inputRow}>
					<TextInput
						style={styles.input}
						value={title}
						onChangeText={setTitle}
					/>
				</View>


				<CirclePicker
					color={color}
					onChangeComplete={e => setColor(e.hex)}
					colors={colorSwatchesSelected}
					styles={{ default: { card: { marginTop: "15px", marginBottom: "5px" } } }}
				/>

				<View style={styles.inputRow}>
					<View style={styles.buttonsRow}>
						<TouchableOpacity style={styles.button} onPress={() => { }}>
							<Text style={styles.buttonText}>-1s</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.button} onPress={() => { }}>
							<Text style={styles.buttonText}>+1s</Text>
						</TouchableOpacity>
					</View>
				</View>
				<View style={{ marginTop: 24 }}>
					<Button title="OK" onPress={handleOk} color={colors.primary} />
				</View>
			</View>
		</View>
	)
}

// @ts-ignore
const enhance = withObservables<{}, { clip: Clip }>([], ({ }) => {
	const { clipId } = useLocalSearchParams<{ clipId: string }>();
	return {
		clip: database.collections
			.get<Clip>("clips")
			.findAndObserve(clipId)
	}
});

const styles = StyleSheet.create({
	modalContainer: {
		...defaultStyles.container,
		flex: 1,
		paddingHorizontal: screenPadding.horizontal,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		backgroundColor: 'rgba(0, 0, 0, 0)',
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
	},
	modal: {
		backgroundColor: colors.background,
		padding: 20,
		borderRadius: 12,
		minWidth: 250,
		maxWidth: '90%',
		elevation: 10,
		zIndex: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 16,
		color: colors.text,
	},
	container: {
		margin: 20,
		position: 'relative',
		color: colors.text,
	},
	text: {
		verticalAlign: 'middle',
		color: colors.text,
	},
	box: {
		borderWidth: 1,
		borderColor: colors.minimumTrackTintColor,
		padding: 20,
		borderRadius: 10,
		paddingTop: 30,
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		verticalAlign: 'middle',
	},
	input: {
		flex: 1,
		borderWidth: 0,
		borderBottomWidth: 1,
		borderRadius: 0,
		textAlign: 'right',
		borderColor: colors.minimumTrackTintColor,
		color: colors.text,
		paddingHorizontal: 10,
		paddingVertical: 5,
		marginRight: 10,
	},
	slider: {
		width: 200,
		height: 40,
		margin: 10,
	},
	buttonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 12,
		gap: 8,
	},
	button: {
		flex: 1,
		backgroundColor: colors.primary,
		paddingVertical: 10,
		paddingHorizontal: 10,
		marginHorizontal: 0,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 0,
	},
	buttonText: {
		color: colors.text,
		fontWeight: 'bold',
		fontSize: 16,
	},
	colorPicker: {
		margin: 10,
	},
	swatchesContainer: {
		alignItems: 'center',
		flexWrap: 'wrap',
		width: 200,
		gap: 10,
	},
	swatchStyle: {
		borderColor: '#AAA',
		borderWidth: 1,
		borderRadius: 20,
		height: 30,
		width: 30,
		margin: 0,
		marginBottom: 0,
		marginHorizontal: 0,
		marginVertical: 0,
	},
})

export default enhance(EditClipModal)
