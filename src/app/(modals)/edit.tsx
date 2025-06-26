import TimeEditor from '@/components/TimeEditor'
import { colors } from '@/constants/tokens'
import Clip from '@/model/clip'
import { database } from '@/model/index.web'
import { containerStyles, inputStyles, modalStyles } from '@/styles'
import { withObservables } from '@nozbe/watermelondb/react'
import { useHeaderHeight } from '@react-navigation/elements'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { CirclePicker } from 'react-color'
import { Button, Pressable, Text, TextInput, View } from 'react-native'

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
		<View style={[modalStyles.modalContainer, { paddingTop: headerHeight }]}>
			<Pressable style={modalStyles.backdrop} onPress={handleCancel} />

			<View style={modalStyles.modal}>
				<Text style={modalStyles.title}>Clip bearbeiten</Text>
				<View style={containerStyles.inputRow}>
					<TextInput
						style={inputStyles.input}
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

				<TimeEditor timeMs={position*1000} onChange={(ms) => setPosition(ms/1000)} />

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


export default enhance(EditClipModal)
